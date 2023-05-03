import Playlist from "../collection/Playlist.js";
import CollectionCache from "../collection/CollectionCache.js";
import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import ServiceInfo from "../ServiceInfo.js";
import APIVersion from "./APIVersion.js";
import TrackList from "../collection/TrackList.js";
import User from "../User.js";

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

    public async getPlaylists(): Promise<Playlist[]> { // get all playlists owned by you
        const response = await this.makeRequest("get", "playlists");
        if (response.statusCode != 200) throw response;
        if (!Array.isArray(response.response)) return [];
        const collections: Playlist[] = [];
        for (let collectionJson of response.response) {
            try {
                const collection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, collectionJson);
                collections.push(collection);
            } catch (e) {}
        }
        return collections;
    }

    public async getPlaylist(collectionID: string, outOfDateThreshold?: number): Promise<Playlist> {
        const cachedPlaylist = this.collectionCache.getCollection(collectionID);
        if (cachedPlaylist instanceof Playlist) {
            try {
                await cachedPlaylist.checkForUpdates(outOfDateThreshold ?? this.context.playlistUpdateFrequency);
            } catch {}
            return cachedPlaylist;
        }
        const response = await this.makeRequest("get", `playlists/${collectionID}`);
        if (response.statusCode != 200) throw response;

        const collection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
        return collection;
    }

    public async createPlaylist(name: string, trackList?: Track[]): Promise<Playlist> {
        if (!trackList) trackList = [];
        const response = await this.makeRequest("post", "playlists", {
            playlist_title: name,
            tracks: trackList.map(track => track.trackID)
        });
        if (response.statusCode != 201) throw response;
        const collection = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, response.response);
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

    public async getCharts(): Promise<TrackList[]> {
        const response = await this.makeRequest("get", "charts");
        if (response.statusCode != 200) throw response;

        const out: TrackList[] = [];
        if (Array.isArray(response.response)) {
            for (let data of response.response) {
                if (typeof data.slug == "string" && typeof data.name == "string") {
                    out.push(new TrackList(this.collectionCache, `charts/${data.slug}`, data.name, null, data.service));
                }
            }
        }

        return out;
    }

    public async getChart(chartSlug: string): Promise<TrackList> {
        const response = await this.makeRequest("get", `charts/${chartSlug}`);
        if (response.statusCode != 200) throw response;

        try {
            const json = response.response;

            const criteria = [
                typeof json?.slug == "string",
                typeof json?.name == "string",
                typeof json?.service == "string",
                !(json?.trackList) || (() => {
                    if (!Array.isArray(json.trackList)) return false;
                    for (let track of json.trackList) {
                        if (typeof track?.trackID != "string") return false;
                    }
                    return true;
                })()
            ];

            for (let option of criteria) {
                if (!option) return null;
            }

            let trackList: Track[] = null;

            if (json?.trackList) {
                trackList = [];
                for (let track of json.trackList) {
                    let trackObject = Track.convertJsonToTrack(this.context, track);
                    if (!trackObject) continue;
                    trackList.push(trackObject);
                    this.trackCache.updateTrack(trackObject);
                }
            }

            const chart = new TrackList(this.collectionCache, "charts/" + json.slug, json.name, trackList, json.service);
            const output = this.collectionCache.setCollection(chart);
            if (output instanceof TrackList) return output;
            return chart;
        } catch (e) {
            console.error(e);
        }

        return null;
    }

    public async getUser(userID: string) {
        const data = await this.makeRequest("get", `user/${userID}`);
        if (data.statusCode != 200) throw data;

        const user: User = data.response.user;
        const playlists: Playlist[] = [];

        if (Array.isArray(data.response.playlists)) {
            for (let rawPlaylist of data.response.playlists) {
                const playlist = Playlist.convertJsonToPlaylist(this.context, this.trackCache, this.collectionCache, rawPlaylist);
                playlists.push(playlist);
            }
        }

        return {
            user,
            playlists
        }
    }
}