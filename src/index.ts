import CollectionCache from "./collection/CollectionCache.js";
import Context from "./Context.js";
import TrackCache from "./music/TrackCache.js";
import V1 from "./version/V1.js";

export default class MusicService {
    private readonly context: Context;
    private readonly collectionCache: CollectionCache;
    public readonly trackCache: TrackCache;

    public readonly v1: V1;

    constructor(serverURL: string, token?: string) {
        this.context = new Context(serverURL, token || null);

        this.trackCache = new TrackCache(this.context);
        this.collectionCache = new CollectionCache(this.context, this.trackCache);

        this.v1 = new V1(this.context, this.trackCache, this.collectionCache);
    }
}