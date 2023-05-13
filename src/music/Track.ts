import Suggestions from "../collection/TrackList.js";
import Context from "../Context";

export interface TrackMeta {
    readonly artists: string[],
    readonly title: string,
    readonly image?: string
}

export interface Lyric {
    time?: number,
    words: string
}

export interface Lyrics {
    synced: boolean,
    provider: string,
    lyrics: Lyric[]
}

export default class Track {
    private readonly context: Context;

    public readonly type: "track";
    public readonly trackID: string;
    public readonly rawTrackID: string;
    private metadata: TrackMeta;
    private lyrics: Lyrics = null;


    constructor(context: Context, trackID: string, metadata?: TrackMeta) {
        this.context = context;
        this.rawTrackID = trackID;
        this.trackID = context.prefixAddress(trackID);
        this.metadata = metadata || null;
    }

    public isUnknown() {
        return this.metadata == null;
    }

    public async loadMetadata() {
        if (!this.metadata) {
            const info = await this.context.makeRequest("get", `v1/tracks/${this.rawTrackID}`);
            if (info.statusCode != 200) return null;
            const tempTrack = Track.convertJsonToTrack(this.context, info.response);
            if (!tempTrack) return null;
            this.metadata = tempTrack.metadata;
        }
        return this.metadata;
    }

    public getMetadata() {
        return this.metadata || null;
    }

    public async getSuggestedTracks(): Promise<Suggestions> {
        const collectionCache = this.context.instance.collectionCache;
        const trackCache = this.context.instance.trackCache;
        const existing = collectionCache.getCollection(`suggestions/${this.rawTrackID}`);
        if (existing && existing instanceof Suggestions) return existing;

        const info = await this.context.makeRequest("get", `v1/tracks/${this.rawTrackID}/suggested`);
        if (info.statusCode != 200 || !Array.isArray(info.response)) return null;
        
        const tracks: Track[] = [];
        for (let json of info.response) {
            const track = Track.convertJsonToTrack(this.context, json);
            if (track) {
                trackCache.updateTrack(track);
                tracks.push(track);
            }
        }
        
        const suggestions = new Suggestions(collectionCache, "suggestions/" + this.rawTrackID, "Suggestions", tracks);

        return suggestions;
    }

    public getAudioUrl() {
        return `${this.context.serverURL}/v1/tracks/${this.rawTrackID}/audio`;
    }

    public getThumbnailUrl() {
        return `${this.context.serverURL}/v1/tracks/${this.rawTrackID}/thumbnail`;
    }

    public async getLyrics() {
        if (this.lyrics) {
            if (!this.lyrics.lyrics.length) return null;
            return this.lyrics;
        }
        try {
            const response = await this.context.makeRequest("get", `v1/tracks/${this.rawTrackID}/lyrics`);
            if (response.statusCode !== 200) throw "bad status code";
            if (typeof response.response?.synced != "boolean") throw "not boolean";
            if (!Array.isArray(response.response?.lyrics)) throw "not array";

            const lyrics: Lyrics = {
                synced: response.response.synced,
                provider: response.response.provider,
                lyrics: []
            };

            if (response.response.synced) {
                for (let line of response.response.lyrics) {
                    if (!line) continue;
                    if (typeof line.time == "number" && typeof line.words == "string") {
                        lyrics.lyrics.push({
                            time: line.time,
                            words: line.words
                        });
                    }
                }
            } else {
                for (let line of response.response.lyrics) {
                    if (!line) continue;
                    if (typeof line.words == "string") {
                        lyrics.lyrics.push({
                            words: line.words
                        });
                    }
                }
            }
            
            this.lyrics = lyrics;
            return lyrics;
        } catch {
            this.lyrics = {
                synced: false,
                provider: "none",
                lyrics: []
            };
            return null;
        }
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