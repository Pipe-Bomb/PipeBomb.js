import Playlist from "../collection/Playlist.js";
import CollectionCache from "../collection/CollectionCache.js";
import Context from "../Context.js";
import Track from "../music/Track.js";
import TrackCache from "../music/TrackCache.js";
import ServiceInfo from "../ServiceInfo.js";
import APIVersion from "./APIVersion.js";
import TrackList from "../collection/TrackList.js";
import User from "../User.js";
import ExternalPlaylist from "../collection/ExternalCollection.js";
import ExternalCollection from "../collection/ExternalCollection.js";
import Axios from "axios";
import ServerInfo from "../ServerInfo.js";
import PipeBomb from "../index.js";

export interface FoundObject {
    responseType: "found object"
    objectType: "playlist" | "track",
    id: string
}

export interface SearchResults {
    responseType: "search results";
    results: (Track | ExternalPlaylist)[]
}

export interface UserProfile {
    user: User,
    playlists: Playlist[]
}

export default class V1 extends APIVersion {
    constructor(context: Context, trackCache: TrackCache, collectionCache: CollectionCache) {
        super("v1", context, trackCache, collectionCache);
    }

    public async search(service: string, query: string): Promise<FoundObject | SearchResults> { // search for tracks
        const response = await this.makeRequest("post", "search", {
            service,
            query
        });
        if (response.statusCode != 200) throw response;

        const responseType: string = response.response.type;

        if (responseType == "object found") {
            const foundObject: FoundObject = {
                responseType: "found object",
                objectType: response.response.object.type,
                id: response.response.object.id
            }
            return foundObject;
        }

        if (responseType == "search results") {
            const tracks: (Track | ExternalPlaylist)[] = [];

            for (let trackInfo of response.response.items) {
                if (trackInfo.type == "track") {
                    const track = Track.convertJsonToTrack(this.context, trackInfo);
                    if (track) {
                        this.trackCache.updateTrack(track);
                        tracks.push(track);
                    }
                } else if (trackInfo.type == "playlist" || trackInfo.type == "album") {
                    const collection = ExternalCollection.convertJsonToExternalCollection(this.context, this.trackCache, this.collectionCache, trackInfo);
                    tracks.push(collection);
                }
            }

            const results: SearchResults = {
                responseType: "search results",
                results: tracks
            }
            return results;
        }

        throw response;
    }

    public async getPlaylists(): Promise<Playlist[]> { // get all playlists owned by you
        const response = await this.makeRequest("get", "playlists");
        if (response.statusCode != 200) throw response;
        if (!Array.isArray(response.response)) return [];
        const collections: Playlist[] = [];
        for (let collectionJson of response.response) {
            try {
                const collection = Playlist.convertJsonToPlaylist(this.context, collectionJson);
                collections.push(collection);
            } catch (e) {}
        }
        return collections;
    }

    public async getPlaylist(collectionID: string, outOfDateThreshold?: number): Promise<Playlist> {
        const instance = await this.context.getInstanceForURI(collectionID);
        collectionID = instance.id;
        if (!instance.ownInstance) {
            if (!instance.instance) throw `Server is not online`;
            return await instance.instance.v1.getPlaylist(collectionID, outOfDateThreshold);
        }


        const cachedPlaylist = this.collectionCache.getCollection(collectionID);
        if (cachedPlaylist instanceof Playlist) {
            try {
                await cachedPlaylist.checkForUpdates(outOfDateThreshold ?? this.context.playlistUpdateFrequency);
            } catch {}
            return cachedPlaylist;
        }
        const response = await this.makeRequest("get", `playlists/${collectionID}`);
        if (response.statusCode != 200) throw response;

        const collection = Playlist.convertJsonToPlaylist(this.context, response.response);
        return collection;
    }

    public async createPlaylist(name: string, trackList?: Track[]): Promise<Playlist> {
        if (!trackList) trackList = [];
        const response = await this.makeRequest("post", "playlists", {
            playlist_title: name,
            tracks: trackList.map(track => track.trackID)
        });
        if (response.statusCode != 201) throw response;
        const collection = Playlist.convertJsonToPlaylist(this.context, response.response);
        return collection;
    }

    public async getExternalPlaylist(playlistID: string) {
        const instance = await this.context.getInstanceForURI(playlistID);
        playlistID = instance.id;
        if (!instance.ownInstance) {
            if (!instance.instance) throw `Server is not online`;
            return await instance.instance.v1.getExternalPlaylist(playlistID);
        }


        const data = await this.makeRequest("get", `externalplaylists/${playlistID}`);
        if (data.statusCode != 200) throw data;
        const collection = ExternalCollection.convertJsonToExternalCollection(this.context, this.trackCache, this.collectionCache, data.response);
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
                    out.push(new TrackList(this.collectionCache, `charts/${data.slug}`, data.name, null, data.service, `${this.context.getHost()}/v1/charts/${data.slug}/thumbnail`));
                }
            }
        }

        return out;
    }

    public async getChart(chartSlug: string): Promise<TrackList> {
        const instance = await this.context.getInstanceForURI(chartSlug);
        chartSlug = instance.id;
        if (!instance.ownInstance) {
            if (!instance.instance) throw `Server is not online`;
            return await instance.instance.v1.getChart(chartSlug);
        }

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

    public async getUser(userID: string): Promise<UserProfile> {
        const instance = await this.context.getInstanceForURI(userID);
        userID = instance.id;
        if (!instance.ownInstance) {
            if (!instance.instance) throw `Server is not online`;
            return await instance.instance.v1.getUser(userID);
        }
        
        const data = await this.makeRequest("get", `user/${userID}`);
        if (data.statusCode != 200) throw data;

        const userData = data.response.user;
        const user: User = {
            userID: this.context.prefixAddress(userData.userID),
            username: userData.username,
            rawID: userData.userID
        }
        
        const playlists: Playlist[] = [];

        if (Array.isArray(data.response.playlists)) {
            for (let rawPlaylist of data.response.playlists) {
                const playlist = Playlist.convertJsonToPlaylist(this.context, rawPlaylist);
                playlists.push(playlist);
            }
        }

        return {
            user,
            playlists
        }
    }

    public async getRegistryServers(url: string) {
        try {
            const { data } = await Axios.get(url + "/servers/index");
            if (data?.statusCode != 200 || !Array.isArray(data?.data)) throw "invalid response";

            const servers: ServerInfo[] = [];

            for (let itemData of data.data) {
                if (typeof itemData?.address != "string") continue;
                if (typeof itemData?.name != "string") continue;
                if (typeof itemData?.https != "boolean") continue;
                if (typeof itemData?.uptime != "number") continue;

                const server = new ServerInfo(itemData.address, itemData.name, itemData.https, itemData.uptime);
                servers.push(server);
            }

            return servers;
        } catch {
            throw `Failed to retrieve servers from registry '${url}'`;
        }
    }
}