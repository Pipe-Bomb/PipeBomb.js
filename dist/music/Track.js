export default class Track {
    constructor(context, trackID, metadata) {
        this.context = context;
        this.trackID = trackID;
        this.metadata = metadata || null;
    }
    isUnknown() {
        return this.metadata == null;
    }
    async getMetadata() {
        if (!this.metadata) {
            const info = await this.context.makeRequest("get", `v1/tracks/${this.trackID}`);
            if (info.statusCode != 200)
                return null;
            const tempTrack = Track.convertJsonToTrack(this.context, info.response);
            if (!tempTrack)
                return null;
            this.metadata = tempTrack.metadata;
        }
        return this.metadata;
    }
    static convertJsonToTrack(context, json) {
        const criteria = [
            typeof json.trackID == "string",
            json.metadata == null || (typeof json?.metadata?.title == "string" &&
                Array.isArray(json?.metadata?.artists) &&
                (() => {
                    for (let artist of json.metadata.artists) {
                        if (typeof artist != "string")
                            return false;
                    }
                    return true;
                })())
        ];
        for (let option of criteria) {
            if (!option)
                return null;
        }
        const track = new Track(context, json.trackID, json.metadata == null ? null : {
            title: json.metadata.title,
            artists: json.metadata.artists,
            image: json.metadata.image || null
        });
        return track;
    }
}
//# sourceMappingURL=Track.js.map