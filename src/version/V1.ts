import Collection from "../collection/Collection.js";
import CollectionCache from "../collection/CollectionCache.js";
import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import ServiceInfo from "../ServiceInfo.js";
import APIVersion from "./APIVersion.js";

export default class V1 extends APIVersion {
    constructor(context: Context, trackCache: TrackCache, collectionCache: CollectionCache) {
        super("v1", context, trackCache, collectionCache);
    }

    public async search(service: string, query: string): Promise<Track[]> { // search for tracks
        const response = await this.makeRequest("post", "search", {
            service,
            query
        });
        if (response.statusCode != 200) throw response;
        const tracks: Track[] = [];

        for (let trackInfo of response.response) {
            const track = Track.convertJsonToTrack(this.context, trackInfo);
            if (track) {
                this.trackCache.updateTrack(track);
                tracks.push(track);
            }
        }
        return tracks;
    }

    public async getPlaylists(): Promise<Collection[]> { // get all playlists owned by you
        const response = await this.makeRequest("get", "playlists");
        if (response.statusCode != 200) throw response;
        if (!Array.isArray(response.response)) return [];
        const collections: Collection[] = [];
        for (let collectionJson of response.response) {
            try {
                const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, collectionJson);
                collections.push(collection);
            } catch (e) {
                
            }
            
        }
        return collections;
    }

    public async getPlaylist(collectionID: string): Promise<Collection> {
        const response = await this.makeRequest("get", `playlists/${collectionID}`);
        if (response.statusCode != 200) throw response;

        const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        return collection;
    }

    public async createPlaylist(name: string, trackList?: Track[]): Promise<Collection> {
        if (!trackList) trackList = [];
        const response = await this.makeRequest("post", "playlists", {
            playlist_title: name,
            tracks: trackList.map(track => track.trackID)
        });
        if (response.statusCode != 201) throw response;
        const collection = Collection.convertJsonToCollection(this.context, this.trackCache, this.collectionCache, response.response);
        return collection;
    }

    public async getServices(): Promise<ServiceInfo[]> {
        const response = await this.makeRequest("get", "services");
        if (response.statusCode != 200) throw response;

        const out: ServiceInfo[] = [];
        if (Array.isArray(response.response)) {
            for (let data of response.response) {
                if (typeof data.name == "string" && typeof data.prefix == "string") {
                    out.push({
                        name: data.name,
                        prefix: data.prefix
                    });
                }
            }
        }

        return out;
    }
}