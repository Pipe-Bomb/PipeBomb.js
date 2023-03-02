import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import User from "../User.js";
import Collection from "./Collection.js";

interface CollectionWrapper {
    collection: Collection,
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

    public setCollection(collection: Collection) {
        const existingCollection = this.getCollection(collection.collectionID);
        if (existingCollection) {
            existingCollection.copyFromOtherCollection(collection);
            return existingCollection;
        }

        this.collections.set(collection.collectionID.toString(), {
            timeout: setTimeout(() => {
                this.deleteCollection(collection.collectionID);
            }, 600_000),
            collection
        });

        return collection;
    }

    public getCollection(collectionID: number): Collection | null {
        const existingCollection = this.collections.get(collectionID.toString());
        if (!existingCollection) return null;
        
        clearTimeout(existingCollection.timeout);
        existingCollection.timeout = setTimeout(() => {
            this.deleteCollection(collectionID);
        }, 600_000);

        return existingCollection.collection;
    }

    private deleteCollection(collectionID: number) {
        const stringID = collectionID.toString();
        const existingCollection = this.collections.get(stringID);
        if (!existingCollection) return;
        clearTimeout(existingCollection.timeout);
        this.collections.delete(stringID);
    }
}