import Context from "../Context";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache";
import CollectionCache from "./CollectionCache";
import TrackList from "./TrackList.js";

export default class ExternalCollection extends TrackList {
    private loadedPages = 0;
    private loading = false;
    private gotFullTracklist = false;
    private updateCallbacks: ((collection: ExternalCollection) => void)[] = [];

    constructor(private context: Context, private trackCache: TrackCache, collectionCache: CollectionCache, collectionID: string, collectionName: string, service: string, public readonly type: string, private size: number, public readonly image?: string) {
        super(collectionCache, collectionID, collectionName, null, service);
    }

    public static convertJsonToExternalCollection(context: Context, trackCache: TrackCache, collectionCache: CollectionCache, json: any) {
        const collection = new ExternalCollection(context, trackCache, collectionCache, json.collectionID, json.name, json.service, json.type, json.size, json.image || null);

        const existingCollection = collectionCache.getCollection(collection.collectionID);
        if (existingCollection instanceof ExternalCollection) {
            existingCollection.copyFromOtherCollection(collection);
            return existingCollection;
        }

        const output = collectionCache.setCollection(collection);
        if (output instanceof ExternalCollection) return output;
        return collection;
    }

    public copyFromOtherCollection(collection: ExternalCollection) {
        if (this.collectionID != collection.collectionID) return;
        let changed = false;
        
        if (this.collectionName != collection.collectionName) {
            this.collectionName = collection.collectionName;
            changed = true;
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
            this.trackList = collection.trackList;
        }

        if (changed) {
            this.pushToCallbacks();
        }
    }

    public async loadNextPage() {
        if (this.loading || this.gotFullTracklist) return;
        try {
            this.loading = false;
            const data = await this.context.makeRequest("get", `v1/externalplaylists/${this.collectionID}/page/${this.loadedPages}`);
            if (data.statusCode != 200) throw "end";
            if (!this.trackList) {
                this.trackList = [];
            }

            for (let item of data.response) {
                const track = Track.convertJsonToTrack(this.context, item);
                if (track) {
                    this.trackList.push(track);
                    this.trackCache.updateTrack(track);
                }
            }
            if (this.trackList.length >= this.size) {
                this.gotFullTracklist = true;
            }
        } catch (e) {
            this.gotFullTracklist = true;
        } finally {
            this.loading = true;
            this.pushToCallbacks();
        }
    }

    public getThumbnailUrl() {
        return `${this.context.serverURL}/v1/externalplaylists/${this.collectionID}/thumbnail`;
    }

    public isLoading() {
        return this.loading;
    }

    public hasFullTracklist() {
        return this.gotFullTracklist;
    }

    private pushToCallbacks() {
        for (let callback of this.updateCallbacks) {
            callback(this);
        }
    }

    public registerUpdateCallback(callback: (collection: ExternalCollection) => void) {
        if (this.updateCallbacks.indexOf(callback) >= 0) return;
        this.updateCallbacks.push(callback);
    }

    public unregisterUpdateCallback(callback: (collection: ExternalCollection) => void) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index >= 0) this.updateCallbacks.splice(index, 1);
    }
}