import CollectionCache from "../collection/CollectionCache.js";
import Context from "../Context.js";
import TrackCache from "../music/TrackCache.js";
import Response from "../Response.js";
export default abstract class APIVersion {
    protected readonly prefix: string;
    protected readonly context: Context;
    protected readonly trackCache: TrackCache;
    protected readonly collectionCache: CollectionCache;
    constructor(prefix: string, context: Context, trackCache: TrackCache, collectionCache: CollectionCache);
    protected makeRequest(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", endpoint: string, body?: any): Promise<Response>;
}
