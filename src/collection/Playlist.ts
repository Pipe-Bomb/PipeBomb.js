import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import User from "../User.js";
import CollectionCache from "./CollectionCache.js";

export default class Playlist {
    private readonly context: Context;
    private readonly trackCache: TrackCache;
    public readonly collectionID: string;
    private name: string;
    public readonly owner: User;
    private trackList: Track[] = null;
    private isDeleted: boolean = false;
    private updateCallbacks: ((collection: Playlist) => void)[] = [];
    private collectionCache: CollectionCache;
    private suggestedTracks: Track[] = [];
    private suggestedTracksUpdated: number = null;
    private checkTimer: ReturnType<typeof setTimeout> = null;
    private lastChecked: number = Date.now();

    constructor(context: Context, trackCache: TrackCache, collectionCache: CollectionCache, collectionID: string, name: string, owner: User, trackList?: Track[]) {
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
            const newCollection = Playlist.convertJsonToPlaylist(this.context, trackCache, this.collectionCache, info.response);
            if (!newCollection) return null;
            this.trackList = newCollection.trackList;
        }
        return Array.from(this.trackList);
    }

    public async getSuggestedTracks(trackCache: TrackCache): Promise<Track[]> {
        this.checkDeletion();
        if (this.suggestedTracksUpdated && this.suggestedTracksUpdated < Date.now() / 1000 - 600) {
            return Array.from(this.suggestedTracks);
        }
        
        try {
            const suggestions = await this.context.makeRequest("get", `v1/playlists/${this.collectionID}/suggested`);
            if (suggestions.statusCode != 200 || !Array.isArray(suggestions.response)) throw "invalid response";

            const out: Track[] = [];
            for (let json of suggestions.response) {
                const track = Track.convertJsonToTrack(this.context, json);
                if (track) {
                    trackCache.updateTrack(track);
                    out.push(track);
                }
            }

            this.suggestedTracks = out;
            this.suggestedTracksUpdated = Math.floor(Date.now() / 1000);
            return Array.from(out);
        } catch {}
        
        return [];
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
        const newCollection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherPlaylist(newCollection);
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
        const newCollection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherPlaylist(newCollection);
    }

    public async setName(name: string): Promise<void> {
        this.checkDeletion();
        const response = await this.context.makeRequest("put", `v1/playlists/${this.collectionID}`, {
            name
        });
        if (response.statusCode != 200) throw response;
        const newCollection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
        if (!newCollection) return;
        this.copyFromOtherPlaylist(newCollection);
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


    public copyFromOtherPlaylist(collection: Playlist) {
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

    public static convertJsonToPlaylist(context: Context, trackCache: TrackCache, collectionCache: CollectionCache, json: any): Playlist {
        const criteria = [
            ["string", "number"].includes(typeof json?.collectionID),
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
        
        const collection = new Playlist(context, trackCache, collectionCache, json.collectionID, json.name, owner, trackList);
        const existingCollection = collectionCache.getCollection(collection.collectionID);
        if (existingCollection instanceof Playlist) {
            existingCollection.copyFromOtherPlaylist(collection);
            return existingCollection;
        }

        const output = collectionCache.setCollection(collection);
        if (output instanceof Playlist) return output;
        return collection;
    }

    private checkDeletion() {
        if (this.isDeleted) throw "Collection is deleted";
    }

    private pushToCallbacks() {
        for (let callback of this.updateCallbacks) {
            callback(this);
        }
        if (this.updateCallbacks.length) this.setLoop();
    }

    public isCollectionDeleted() {
        return this.isDeleted;
    }

    public registerUpdateCallback(callback: (collection: Playlist) => void) {
        if (this.updateCallbacks.indexOf(callback) >= 0) return;
        this.updateCallbacks.push(callback);

        if (this.updateCallbacks.length == 1) this.setLoop();
    }

    public unregisterUpdateCallback(callback: (collection: Playlist) => void) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index >= 0) this.updateCallbacks.splice(index, 1);

        if (!this.updateCallbacks.length && this.checkTimer) {
            clearTimeout(this.checkTimer);
            this.checkTimer = null;
        }
    }

    private setLoop() {
        if (this.checkTimer) clearTimeout(this.checkTimer);
        this.checkTimer = setTimeout(async () => {
            try {
                await this.checkForUpdates(0);
            } catch (e) {}
        }, this.context.playlistUpdateFrequency * 1000);
    }

    public async checkForUpdates(outOfDateThreshold: number) {
        if (outOfDateThreshold && Date.now() - outOfDateThreshold * 1000 < this.lastChecked) return;

        if (this.checkTimer) clearTimeout(this.checkTimer);

        try {
            const response = await this.context.makeRequest("get", `v1/playlists/${this.collectionID}`);
            this.lastChecked = Date.now();
            if (response.statusCode != 200) throw response;
            const collection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
            this.copyFromOtherPlaylist(collection);
            if (this.updateCallbacks.length) this.setLoop();
        } catch (e) {
            if (this.updateCallbacks.length) this.setLoop();
            throw e;
        }
    }
}