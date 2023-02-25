import Track from "../music/Track.js";
export default class Collection {
    constructor(context, trackCache, collectionID, name, owner, trackList) {
        this.trackList = null;
        this.isDeleted = false;
        this.context = context;
        this.trackCache = trackCache;
        this.collectionID = collectionID;
        this.name = name;
        this.owner = owner;
        if (trackList?.length) {
            this.trackList = trackList;
        }
    }
    async getTrackList(trackCache) {
        this.checkDeletion();
        if (this.trackList == null) {
            const info = await this.context.makeRequest("get", `v1/playlists/${this.collectionID}`);
            if (info.statusCode != 200)
                return null;
            const newCollection = Collection.convertJsonToCollection(this.context, trackCache, info.response);
            if (!newCollection)
                return null;
            this.trackList = newCollection.trackList;
        }
        return this.trackList;
    }
    getName() {
        return this.name;
    }
    async addTracks(...tracks) {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            tracks: {
                add: tracks.map(track => {
                    return track.trackID;
                })
            }
        });
        const newCollection = Collection.convertJsonToCollection(this.context, this.trackCache, response.response);
        if (!newCollection)
            return;
        this.copyFromOtherCollection(newCollection);
    }
    async removeTracks(...tracks) {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            tracks: {
                remove: tracks.map(track => {
                    return track.trackID;
                })
            }
        });
        const newCollection = Collection.convertJsonToCollection(this.context, this.trackCache, response.response);
        if (!newCollection)
            return;
        this.copyFromOtherCollection(newCollection);
    }
    async deleteCollection() {
        const response = await this.context.makeRequest("delete", `v1/playlists/${this.collectionID}`);
        if (response.statusCode != 204)
            throw response;
        this.isDeleted = true;
        this.trackList = [];
    }
    copyFromOtherCollection(collection) {
        this.checkDeletion();
        if (this.collectionID != collection.collectionID)
            return;
        this.name = collection.name;
        this.trackList = collection.trackList;
    }
    static convertJsonToCollection(context, trackCache, json) {
        const criteria = [
            typeof json?.collectionID == "number",
            typeof json?.name == "string",
            json?.owner == null || (typeof json?.owner?.userID == "string" && typeof json?.owner?.username == "string"),
            !(json?.trackList) || (() => {
                if (!Array.isArray(json.trackList))
                    return false;
                for (let track of json.trackList) {
                    if (typeof track?.trackID != "string")
                        return false;
                }
                return true;
            })()
        ];
        for (let option of criteria) {
            if (!option)
                return null;
        }
        let owner = json?.owner ? {
            userID: json.owner.userID,
            username: json.owner.username
        } : null;
        let trackList = null;
        if (json?.trackList) {
            trackList = [];
            for (let track of json.trackList) {
                let trackObject = Track.convertJsonToTrack(context, track);
                if (!trackObject)
                    continue;
                trackList.push(trackObject);
                trackCache.updateTrack(trackObject);
            }
        }
        const collection = new Collection(context, trackCache, json.collectionID, json.name, owner, trackList);
        return collection;
    }
    checkDeletion() {
        if (this.isDeleted)
            throw "Collection is deleted";
    }
}
//# sourceMappingURL=Collection.js.map