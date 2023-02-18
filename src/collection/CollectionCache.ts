import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import User from "../User.js";
import Collection from "./Collection.js";

export default class CollectionCache {
    private readonly context: Context;
    private readonly trackCache: TrackCache;

    public constructor(context: Context, trackCache: TrackCache) {
        this.context = context;
        this.trackCache = trackCache;
    }
}