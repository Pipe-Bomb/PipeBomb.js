import Request from "./Request.js";
import Response from "./Response.js";
import PipeBomb, { PipeBombOptions } from "./index.js";

export default class Context {
    private instances: Map<string, PipeBomb> = new Map();

    public readonly playlistUpdateFrequency: number;
    private token: string;
    private privateKey: string;
    private serverAddress: string;
    private username: string;

    public constructor(
        public serverURL: string,
        public readonly instance: PipeBomb,
        private options: PipeBombOptions
    ) {
        if (this.serverURL.toLowerCase().startsWith("http://")) {
            this.serverAddress = this.serverURL.substring(7);
        } else if (this.serverURL.toLowerCase().startsWith("https://")) {
            this.serverAddress = this.serverURL.substring(8);
        } else {
            this.serverAddress = this.serverURL;
        }

        this.token = options?.token || null;
        this.privateKey = options?.privateKey || null;
        this.playlistUpdateFrequency = options?.playlistUpdateFrequency ?? 10;
    }

    public setHost(host: string) {
        this.instances.clear();
        this.serverURL = host;
        if (this.serverURL.toLowerCase().startsWith("http://")) {
            this.serverAddress = this.serverURL.substring(7);
        } else if (this.serverURL.toLowerCase().startsWith("https://")) {
            this.serverAddress = this.serverURL.substring(8);
        } else {
            this.serverAddress = this.serverURL;
        }
    }

    public getHost() {
        return this.serverURL;
    }

    public getAddress() {
        return this.serverAddress;
    }

    public setToken(token: string) {
        this.token = token;
    }

    public getToken() {
        return this.token;
    }

    public setUsername(username: string) {
        this.username = username;
        for (let instance of this.instances.values()) {
            instance.context.setUsername(username);
        }
    }

    public getUsername() {
        return this.username;
    }

    public setPrivateKey(token: string) {
        this.token = token;
        this.instances.forEach(instance => {
            instance.context.setPrivateKey(token);
        });
    }

    public getPrivateKey() {
        return this.privateKey;
    }



    public makeRequest(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", endpoint: string, body?: any): Promise<Response> {
        return new Promise((resolve, reject) => {
            try {
                const request = new Request(method, `${this.serverURL}/${endpoint}`, this.token, body || {});
                request.addSuccessHandler(response => {
                    resolve(response);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    public async getInstanceForURI(uri: string) {
        if (!this.isAuthenticated()) throw "Instance is not authenticated";

        if (typeof uri == "number" || !uri.includes("@")) return {
            ownInstance: true,
            instance: this.instance,
            id: uri
        };

        const parts = uri.split("@", 2);
        if (parts[0] == this.serverAddress) return {
            ownInstance: true,
            instance: this.instance,
            id: parts[1]
        };

        const existingInstance = this.instances.get(parts[0]);
        if (existingInstance) return {
            ownInstance: false,
            instance: existingInstance,
            id: parts[1]
        };

        const hostInfo = await PipeBomb.checkHost(parts[0]);
        if (!hostInfo) return {
            ownInstance: false,
            instance: null,
            id: parts[1]
        };

        const serverUrl = `http${hostInfo.https ? "s" : ""}://${parts[0]}`;

        const instance = new PipeBomb(serverUrl, {
            ...this.options,
            includeAddressInIds: true
        });

        await instance.authenticate(this.username, {
            privateKey: this.privateKey,
            createIfMissing: true // todo, use callback to make this optional
        })

        this.instances.set(parts[0], instance);
        return {
            ownInstance: false,
            instance: instance,
            id: parts[1]
        };
    }

    public isAuthenticated() {
        return !!this.privateKey && !!this.token && !!this.username;
    }

    public getOptions() {
        return {...this.options};
    }

    public prefixAddress(id: string, ignoreOptions?: boolean) {
        if ((!ignoreOptions && !this.options?.includeAddressInIds) || (typeof id == "string" && id.includes("@"))) return id;

        return this.serverAddress + "@" + id;
    }
}