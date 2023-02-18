export default class APIVersion {
    constructor(prefix, context, trackCache, collectionCache) {
        this.prefix = prefix;
        this.context = context;
        this.trackCache = trackCache;
        this.collectionCache = collectionCache;
    }
    makeRequest(method, endpoint, body) {
        return this.context.makeRequest(method, `${this.prefix}/${endpoint}`, body);
    }
}
//# sourceMappingURL=APIVersion.js.map