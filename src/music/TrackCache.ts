import Context from "../Context.js";
import Track from "./Track.js";

interface TrackContainer {
    track: Track,
    timer: ReturnType<typeof setTimeout>
};

export default class TrackCache {
    private readonly context: Context;
    private cache: Map<string, TrackContainer> = new Map();

    public constructor(context: Context) {
        this.context = context;
    }

    updateTrack(track: Track): this {
        let existingTrack = this.cache.get(track.trackID);
        if (existingTrack) clearTimeout(existingTrack.timer);

        if (existingTrack && track.isUnknown() && !existingTrack.track.isUnknown()) {
            this.resetTimer(existingTrack);
            return this;
        }
        
        const container: TrackContainer = {
            track,
            timer: null
        };
        this.cache.set(track.trackID, container);
        this.resetTimer(container);
        return this;
    }

    public async getTrack(trackID: string): Promise<Track> {
        let cachedTrack = this.cache.get(trackID);
        if (cachedTrack) {
            this.resetTimer(cachedTrack);
            return cachedTrack.track;
        }

        console.log("getting track");
        const result = await this.context.makeRequest("get", `v1/tracks/${trackID}`);

        cachedTrack = this.cache.get(trackID);
        if (cachedTrack) {
            this.resetTimer(cachedTrack);
            return cachedTrack.track;
        }

        if (result.statusCode != 200) throw result;
        const track = Track.convertJsonToTrack(this.context, result.response);
        if (!track) return null;

        const container: TrackContainer = {
            track,
            timer: null
        };
        this.resetTimer(container);
        this.cache.set(track.trackID, container);
        return track;
    }

    private resetTimer(trackContainer: TrackContainer) {
        clearTimeout(trackContainer.timer);
        trackContainer.timer = setTimeout(() => {
            this.cache.delete(trackContainer.track.trackID);
        }, 60 * 1000);
    }
}