import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache";
import User from "../User.js";
export default class Collection {
    private readonly context;
    private readonly trackCache;
    readonly collectionID: number;
    private name;
    readonly owner: User;
    private trackList;
    private isDeleted;
    constructor(context: Context, trackCache: TrackCache, collectionID: number, name: string, owner: User, trackList?: Track[]);
    getTrackList(trackCache: TrackCache): Promise<Track[]>;
    getName(): string;
    addTracks(...tracks: Track[]): Promise<void>;
    removeTracks(...tracks: Track[]): Promise<void>;
    deleteCollection(): Promise<void>;
    private copyFromOtherCollection;
    static convertJsonToCollection(context: Context, trackCache: TrackCache, json: any): Collection;
    private checkDeletion;
}
