import Axios from "axios";
import CollectionCache from "./collection/CollectionCache.js";
import Context from "./Context.js";
import TrackCache from "./music/TrackCache.js";
import HostInfo from "./HostInfo.js";
import V1 from "./version/V1.js";
import Playlist from "./collection/Playlist.js";


export interface PipeBombOptions {
    token?: string,
    CollectionCacheTime?: number,
    PlaylistUpdateFrequency?: number,
    trackCacheTime?: number
}

export default class PipeBomb {
    private readonly context: Context;
    public readonly collectionCache: CollectionCache;
    public readonly trackCache: TrackCache;

    public readonly v1: V1;

    constructor(serverURL: string, options?: PipeBombOptions) {
        this.context = new Context(serverURL, options?.token || null, options?.PlaylistUpdateFrequency ?? 10);

        this.trackCache = new TrackCache(this.context, options?.trackCacheTime ?? 60);
        this.collectionCache = new CollectionCache(this.context, this.trackCache, options?.CollectionCacheTime ?? 600);

        this.v1 = new V1(this.context, this.trackCache, this.collectionCache);
    }

    public setHost(serverURL: string) {
        this.context.serverURL = serverURL;
    }

    public setToken(token: string) {
        this.context.token = token;
    }

    public static async checkHost(serverURL: string): Promise<HostInfo | null> {
        if (serverURL.toLowerCase().startsWith("http://")) {
            serverURL = serverURL.substring(7);
        } else if (serverURL.toLowerCase().startsWith("https://")) {
            serverURL = serverURL.substring(8);
        }
        while (serverURL.endsWith("/")) {
            serverURL = serverURL.slice(0, -1);
        }

        function connect(https: boolean): Promise<string> {
            return new Promise(async (resolve, reject) => {
                Axios.get(`http${https ? "s" : ""}://${serverURL}/v1/identify`)
                .then(data => {
                    if (data.data?.statusCode == 200 && data.data?.response?.pipeBombServer === true || typeof data.data?.response?.name === "string") {
                        return resolve(data.data.response.name);
                    }
                    reject("not pipe bomb");
                }, () => {
                    reject("connection failure");
                });
            });
        }

        try {
            const name = await connect(true);
            return {
                host: "https://" + serverURL,
                name,
                https: true
            };
        } catch (e) {
            if (e == "not pipe bomb") {
                return null;
            }
        }
        try {
            const name = await connect(false);
            return {
                host: "http://" + serverURL,
                name,
                https: false
            };
        } catch {}
        return null;
    }
}