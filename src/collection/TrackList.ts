import Track from "../music/Track";
import CollectionCache from "./CollectionCache";

export default class TrackList {
    public readonly collectionID: string;
    protected collectionName: string;
    public readonly service?: string;
    protected trackList: Track[] | null;
    public readonly thumbnail: string | null = null;

    constructor(collectionCache: CollectionCache, collectionID: string, collectionName: string, trackList: Track[] | null, service?: string, thumbnail?: string) {
        this.collectionID = collectionID;
        this.collectionName = collectionName;
        this.trackList = trackList;
        if (service) this.service = service;
        if (thumbnail) this.thumbnail = thumbnail;
        collectionCache.setCollection(this);
    }

    public getTrackList() {
        if (!this.trackList) return null;
        return Array.from(this.trackList);
    }

    public copyFromOtherTrackList(trackList: TrackList) {
        let changed = false;

        if (trackList.trackList !== null) {
            if (this.trackList !== null && this.trackList.length == trackList.trackList.length) {
                for (let i = 0; i < this.trackList.length; i++) {
                    if (this.trackList[i].trackID != trackList.trackList[i].trackID) {
                        changed = true;
                        break;
                    }
                }
            } else {
                changed = true;
            }
        }

        if (trackList.trackList) {
            this.trackList = trackList.trackList;
        }
        
    }

    public getName() {
        return this.collectionName;
    }
}