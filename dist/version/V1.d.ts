import Collection from "../collection/Collection.js";
import CollectionCache from "../collection/CollectionCache.js";
import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import APIVersion from "./APIVersion.js";
export default class V1 extends APIVersion {
    constructor(context: Context, trackCache: TrackCache, collectionCache: CollectionCache);
    search(service: string, query: string): Promise<Track[]>;
    getPlaylists(): Promise<Collection[]>;
    getPlaylist(collectionID: number): Promise<Collection>;
    createPlaylist(name: string, trackList?: Track[]): Promise<Collection>;
}
