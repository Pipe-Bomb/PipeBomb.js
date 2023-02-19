import Context from "../Context.js";
import Track from "./Track.js";
export default class TrackCache {
    private readonly context;
    private cache;
    constructor(context: Context);
    updateTrack(track: Track): this;
    getTrack(trackID: string): Promise<Track>;
    private resetTimer;
}
