import Context from "../Context";
interface TrackMeta {
    readonly artists: string[];
    readonly title: string;
    readonly image?: string;
}
export default class Track {
    private readonly context;
    readonly type: "track";
    readonly trackID: string;
    private metadata;
    constructor(context: Context, trackID: string, metadata?: TrackMeta);
    isUnknown(): boolean;
    getMetadata(): Promise<TrackMeta>;
    static convertJsonToTrack(context: Context, json: any): Track;
}
export {};
