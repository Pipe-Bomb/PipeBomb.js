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
            existingCollection.copyFromOtherTrackList(collection);
            return existingCollection;
        }

        const output = collectionCache.setCollection(collection);
        if (output instanceof ExternalCollection) {
            return output;
        }
        return collection;
    }

    public async loadNextPage() {
        if (this.loading || (this.gotFullTracklist && this.trackList)) return false;
        try {
            this.gotFullTracklist = false;
            this.loading = true;
            if (!this.trackList) {
                this.loadedPages = 0;
            }
            this.pushToCallbacks();
            const data = await this.context.makeRequest("get", `v1/externalplaylists/${this.collectionID}/page/${this.loadedPages++}`);
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

            this.loading = false;
            this.pushToCallbacks();
            return true;
        } catch {
            this.gotFullTracklist = true;
            this.loading = false;
            this.pushToCallbacks();
            return false;
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

    public getTrackListLength() {
        return this.size;
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