import Track from "../music/Track";
import CollectionCache from "./CollectionCache";

export default class Suggestions {
    public readonly parentTrack: Track;
    public readonly collectionID: string;
    private trackList: Track[];

    constructor(collectionCache: CollectionCache, parentTrack: Track, trackList: Track[]) {
        this.parentTrack = parentTrack;
        this.trackList = trackList;
        this.collectionID = `${this.parentTrack.trackID}/suggestions`;
        collectionCache.setCollection(this);
    }

    public getTrackList() {
        return Array.from(this.trackList);
    }
}