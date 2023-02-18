import CollectionCache from "./collection/CollectionCache.js";
import Context from "./Context.js";
import TrackCache from "./music/TrackCache.js";
import V1 from "./version/V1.js";

export default class MusicService {
    private readonly context: Context;
    private readonly collectionCache: CollectionCache;
    public readonly trackCache: TrackCache;

    public readonly v1: V1;

    constructor(serverURL: string, token?: string) {
        this.context = new Context(serverURL, token || null);

        this.trackCache = new TrackCache(this.context);
        this.collectionCache = new CollectionCache(this.context, this.trackCache);

        this.v1 = new V1(this.context, this.trackCache, this.collectionCache);
    }
}

const service = new MusicService("http://localhost:8000", "dkcxLLnhjgHKphreADgFmX7r31r0RHTtY6C9oaf3");



(async () => {
    // const playlist = (await service.v1.getPlaylists())[0];
    // await (await playlist.getTrackList(service.trackCache))[0].getMetadata();
    // console.log(playlist);

    // const tracks = await service.v1.search("SoundCloud", "magenta dnb");
    // const track = tracks[0];
    // await playlist.addTracks(track);

    // console.log(await service.v1.createPlaylist("Cool New Playlist", tracks));
    try {
        const playlist = await service.v1.getPlaylist(11);
        await playlist.deleteCollection();
    } catch (e) {
        console.log(e);
    }
    
    // console.log(playlist);
    // try {
    //     
    // } catch (e) {
    //     // console.log(e);
    // }
    console.log("done!");
})();