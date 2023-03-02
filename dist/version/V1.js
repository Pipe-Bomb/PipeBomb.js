import Collection from "../collection/Collection.js";
import Track from "../music/Track.js";
import APIVersion from "./APIVersion.js";
export default class V1 extends APIVersion {
    constructor(context, trackCache, collectionCache) {
        super("v1", context, trackCache, collectionCache);
    }
    async search(service, query) {
        const response = await this.makeRequest("post", "search", {
            service,
            query
        });
        if (response.statusCode != 200)
            throw response;
        const tracks = [];
        for (let trackInfo of response.response) {
            const track = Track.convertJsonToTrack(this.context, trackInfo);
            if (track)
                tracks.push(track);
        }
        return tracks;
    }
    async getPlaylists() {
        const response = await this.makeRequest("get", "playlists");
        if (response.statusCode != 200)
            throw response;
        if (!Array.isArray(response.response))
            return [];
        const collections = [];
        for (let collectionJson of response.response) {
            try {
                const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, collectionJson);
                collections.push(collection);
            }
            catch (e) {
            }
        }
        return collections;
    }
    async getPlaylist(collectionID) {
        const response = await this.makeRequest("get", `playlists/${collectionID}`);
        if (response.statusCode != 200)
            throw response;
        const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        return collection;
    }
    async createPlaylist(name, trackList) {
        if (!trackList)
            trackList = [];
        const response = await this.makeRequest("post", "playlists", {
            playlist_title: name,
            tracks: trackList.map(track => track.trackID)
        });
        if (response.statusCode != 201)
            throw response;
        const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        return collection;
    }
}
//# sourceMappingURL=V1.js.map