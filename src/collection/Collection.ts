import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache";
import User from "../User.js";
import CollectionCache from "./CollectionCache.js";

export default class Collection {
    private readonly context: Context;
    private readonly trackCache: TrackCache;
    public readonly collectionID: number;
    private name: string;
    public readonly owner: User;
    private trackList: Track[] = null;
    private isDeleted: boolean = false;
    private updateCallbacks: ((collection: Collection) => void)[] = [];
    private collectionCache: CollectionCache;

    constructor(context: Context, trackCache: TrackCache, collectionCache: CollectionCache, collectionID: number, name: string, owner: User, trackList?: Track[]) {
        this.context = context;
        this.trackCache = trackCache;
        this.collectionCache = collectionCache;
        this.collectionID = collectionID;
        this.name = name;
        this.owner = owner;
        this.trackList = trackList;
    }

    public async getTrackList(trackCache: TrackCache): Promise<Track[]> {
        this.checkDeletion();
        if (this.trackList == null) {
            const info = await this.context.makeRequest("get", `v1/playlists/${this.collectionID}`);
            if (info.statusCode != 200) return null;
            const newCollection = Collection.convertJsonToCollection(this.context, trackCache, this.collectionCache, info.response);
            if (!newCollection) return null;
            this.trackList = newCollection.trackList;
        }
        return this.trackList;
    }

    public getName(): string {
        return this.name;
    }

    public async addTracks(...tracks: Track[]): Promise<void> {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            tracks: {
                add: tracks.map(track => {
                    return track.trackID
                })
            }
        });
        if (response.statusCode != 200) throw response;
        const newCollection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherCollection(newCollection);
    }

    public async removeTracks(...tracks: Track[]): Promise<void> {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            tracks: {
                remove: tracks.map(track => {
                    return track.trackID
                })
            }
        });
        if (response.statusCode != 200) throw response;
        const newCollection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherCollection(newCollection);
    }

    public async setName(name: string): Promise<void> {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            name
        });
        if (response.statusCode != 200) throw response;
        const newCollection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherCollection(newCollection);
    }

    public async deleteCollection(): Promise<void> {
        const response = await this.context.makeRequest("delete", `v1/playlists/${this.collectionID}`);
        if (response.statusCode != 204) throw response;
        this.isDeleted = true;
        this.trackList = [];
        this.pushToCallbacks();
    }

    public async renameCollection(name: string): Promise<void> {
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            name
        });
        if (response.statusCode != 200) throw response;
        this.name = name;
        this.pushToCallbacks();
    }


    public copyFromOtherCollection(collection: Collection) {
        this.checkDeletion();
        if (this.collectionID != collection.collectionID) return;
        let changed = false;
        if (this.name != collection.name) {
            changed = true;
            this.name = collection.name;
        }
        if (collection.trackList !== null) {
            if (this.trackList !== null && this.trackList.length == collection.trackList.length) {
                for (let i = 0; i < this.trackList.length; i++) {
                    if (this.trackList[i].trackID != collection.trackList[i].trackID) {
                        changed = true;
                        break;
                    }
                }
            } else {
                changed = true;
            }
        }
        
        this.trackList = collection.trackList;

        if (changed) {
            this.pushToCallbacks();
        }
    }

    public static convertJsonToCollection(context: Context, trackCache: TrackCache, collectionCache: CollectionCache, json: any) {
        const criteria = [
            typeof json?.collectionID == "number",
            typeof json?.name == "string",
            json?.owner == null || (typeof json?.owner?.userID == "string" && typeof json?.owner?.username == "string"),
            !(json?.trackList) || (() => {
                if (!Array.isArray(json.trackList)) return false;
                for (let track of json.trackList) {
                    if (typeof track?.trackID != "string") return false;
                }
                return true;
            })()
        ];
        for (let option of criteria) {
            if (!option) return null;
        }

        let owner: User = json?.owner ? {
            userID: json.owner.userID,
            username: json.owner.username
        } : null;

        let trackList: Track[] = null;

        if (json?.trackList) {
            trackList = [];
            for (let track of json.trackList) {
                let trackObject = Track.convertJsonToTrack(context, track);
                if (!trackObject) continue;
                trackList.push(trackObject);
                trackCache.updateTrack(trackObject);
            }
        }
        
        const collection = new Collection(context, trackCache, collectionCache, json.collectionID, json.name, owner, trackList);
        return collectionCache.setCollection(collection);
    }

    private checkDeletion() {
        if (this.isDeleted) throw "Collection is deleted";
    }

    private pushToCallbacks() {
        for (let callback of this.updateCallbacks) {
            callback(this);
        }
    }

    public isCollectionDeleted() {
        return this.isDeleted;
    }

    public registerUpdateCallback(callback: (collection: Collection) => void) {
        if (this.updateCallbacks.indexOf(callback) >= 0) return;
        this.updateCallbacks.push(callback);
    }

    public unregisterUpdateCallback(callback: (collection: Collection) => void) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index >= 0) this.updateCallbacks.splice(index, 1);
    }
}