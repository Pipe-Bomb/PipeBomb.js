import TrackCache from "./music/TrackCache.js";
import V1 from "./version/V1.js";
export default class PipeBomb {
    private readonly context;
    private readonly collectionCache;
    readonly trackCache: TrackCache;
    readonly v1: V1;
    constructor(serverURL: string, token?: string);
}
