import CollectionCache from "./collection/CollectionCache.js";
import Context from "./Context.js";
import TrackCache from "./music/TrackCache.js";
import V1 from "./version/V1.js";
export default class MusicService {
    constructor(serverURL, token) {
        this.context = new Context(serverURL, token || null);
        this.trackCache = new TrackCache(this.context);
        this.collectionCache = new CollectionCache(this.context, this.trackCache);
        this.v1 = new V1(this.context, this.trackCache, this.collectionCache);
    }
}
//# sourceMappingURL=index.js.map