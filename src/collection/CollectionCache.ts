import Context from "../Context.js";
import TrackCache from "../music/TrackCache.js";
import Playlist from "./Playlist.js";
import TrackList from "./TrackList.js";

interface CollectionWrapper {
    collection: Playlist | TrackList,
    timeout: ReturnType<typeof setTimeout>
}

export default class CollectionCache {
    private readonly context: Context;
    private readonly trackCache: TrackCache;
    private collections: Map<string, CollectionWrapper> = new Map();

    public constructor(context: Context, trackCache: TrackCache) {
        this.context = context;
        this.trackCache = trackCache;
    }

    public setCollection(collection: Playlist | TrackList) {
        const existingCollection = this.getCollection(collection.collectionID);

        if (existingCollection) {
            if (existingCollection instanceof Playlist && collection instanceof Playlist) { // both playlists
                existingCollection.copyFromOtherPlaylist(collection);
                return existingCollection;
            }

            if (existingCollection instanceof TrackList && collection instanceof TrackList) { // both tracklists
                existingCollection.copyFromOtherTrackList(collection);
                return existingCollection;
            }
        }

        this.collections.set(collection.collectionID, {
            timeout: setTimeout(() => {
                this.deleteCollection(collection.collectionID);
            }, 600_000),
            collection
        });

        return collection;
    }

    public getCollection(collectionID: string): Playlist | TrackList | null {
        const existingCollection = this.collections.get(collectionID);
        if (!existingCollection) return null;
        
        clearTimeout(existingCollection.timeout);
        existingCollection.timeout = setTimeout(() => {
            this.deleteCollection(collectionID);
        }, 600_000);

        return existingCollection.collection;
    }

    private deleteCollection(collectionID: string) {
        const existingCollection = this.collections.get(collectionID);
        if (!existingCollection) return;
        clearTimeout(existingCollection.timeout);
        this.collections.delete(collectionID);
    }
}