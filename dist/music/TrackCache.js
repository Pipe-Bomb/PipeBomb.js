import Track from "./Track.js";
;
export default class TrackCache {
    constructor(context) {
        this.cache = new Map();
        this.context = context;
    }
    updateTrack(track) {
        let existingTrack = this.cache.get(track.trackID);
        if (existingTrack)
            clearTimeout(existingTrack.timer);
        if (existingTrack && track.isUnknown() && !existingTrack.track.isUnknown()) {
            this.resetTimer(existingTrack);
            return this;
        }
        const container = {
            track,
            timer: null
        };
        this.cache.set(track.trackID, container);
        this.resetTimer(container);
        return this;
    }
    async getTrack(trackID) {
        let cachedTrack = this.cache.get(trackID);
        if (cachedTrack) {
            this.resetTimer(cachedTrack);
            return cachedTrack.track;
        }
        const result = await this.context.makeRequest("get", `v1/tracks/${trackID}`);
        cachedTrack = this.cache.get(trackID);
        if (cachedTrack) {
            this.resetTimer(cachedTrack);
            return cachedTrack.track;
        }
        if (result.statusCode != 200)
            throw result;
        const track = Track.convertJsonToTrack(this.context, result.response);
        if (!track)
            return null;
        const container = {
            track,
            timer: null
        };
        this.resetTimer(container);
        this.cache.set(track.trackID, container);
        return track;
    }
    resetTimer(trackContainer) {
        clearTimeout(trackContainer.timer);
        trackContainer.timer = setTimeout(() => {
            this.cache.delete(trackContainer.track.trackID);
        }, 60 * 1000);
    }
}
//# sourceMappingURL=TrackCache.js.map