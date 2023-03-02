export default class CollectionCache {
    constructor(context, trackCache) {
        this.collections = new Map();
        this.context = context;
        this.trackCache = trackCache;
    }
    setCollection(collection) {
        const existingCollection = this.getCollection(collection.collectionID);
        if (existingCollection) {
            existingCollection.copyFromOtherCollection(collection);
            return existingCollection;
        }
        this.collections.set(collection.collectionID.toString(), {
            timeout: setTimeout(() => {
                this.deleteCollection(collection.collectionID);
            }, 600000),
            collection
        });
        return collection;
    }
    getCollection(collectionID) {
        const existingCollection = this.collections.get(collectionID.toString());
        if (!existingCollection)
            return null;
        clearTimeout(existingCollection.timeout);
        existingCollection.timeout = setTimeout(() => {
            this.deleteCollection(collectionID);
        }, 600000);
        return existingCollection.collection;
    }
    deleteCollection(collectionID) {
        const stringID = collectionID.toString();
        const existingCollection = this.collections.get(stringID);
        if (!existingCollection)
            return;
        clearTimeout(existingCollection.timeout);
        this.collections.delete(stringID);
    }
}
//# sourceMappingURL=CollectionCache.js.map