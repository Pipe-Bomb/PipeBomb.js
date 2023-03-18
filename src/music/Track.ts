import CollectionCache from "../collection/CollectionCache";
import Suggestions from "../collection/Suggestions.js";
import Context from "../Context";

interface TrackMeta {
    readonly artists: string[],
    readonly title: string,
    readonly image?: string
}

export default class Track {
    private readonly context: Context;

    public readonly type: "track";
    public readonly trackID: string;
    private metadata: TrackMeta;

    constructor(context: Context, trackID: string, metadata?: TrackMeta) {
        this.context = context;
        this.trackID = trackID;
        this.metadata = metadata || null;
    }

    public isUnknown() {
        return this.metadata == null;
    }

    public async getMetadata() {
        if (!this.metadata) {
            const info = await this.context.makeRequest("get", `v1/tracks/${this.trackID}`);
            if (info.statusCode != 200) return null;
            const tempTrack = Track.convertJsonToTrack(this.context, info.response);
            if (!tempTrack) return null;
            this.metadata = tempTrack.metadata;
        }
        return this.metadata;
    }

    public async getSuggestedTracks(collectionCache: CollectionCache): Promise<Suggestions> {
        const existing = collectionCache.getCollection(`${this.trackID}/suggestions`);
        if (existing && existing instanceof Suggestions) return existing;

        const info = await this.context.makeRequest("get", `v1/tracks/${this.trackID}/suggested`);
        if (info.statusCode != 200 || !Array.isArray(info.response)) return null;
        
        const tracks: Track[] = [];
        for (let json of info.response) {
            const track = Track.convertJsonToTrack(this.context, json);
            if (track) tracks.push(track);
        }
        
        const suggestions = new Suggestions(collectionCache, this, tracks);

        return suggestions;
    }



    public static convertJsonToTrack(context: Context, json: any): Track {
        const criteria = [
            typeof json.trackID == "string",
            json.metadata == null || (
                typeof json?.metadata?.title == "string" &&
                Array.isArray(json?.metadata?.artists) &&
                (() => {
                    for (let artist of json.metadata.artists) {
                        if (typeof artist != "string") return false;
                    }
                    return true;
                })()
            )
        ];

        for (let option of criteria) {
            if (!option) return null;
        }

        const track = new Track(context, json.trackID, json.metadata == null ? null : {
            title: json.metadata.title,
            artists: json.metadata.artists,
            image: json.metadata.image || null
        });
        return track;
    }
}