import Context from "../Context.js";
import TrackCache from "../music/TrackCache.js";
import Collection from "./Collection.js";
export default class CollectionCache {
    private readonly context;
    private readonly trackCache;
    private collections;
    constructor(context: Context, trackCache: TrackCache);
    setCollection(collection: Collection): Collection;
    getCollection(collectionID: number): Collection | null;
    private deleteCollection;
}
