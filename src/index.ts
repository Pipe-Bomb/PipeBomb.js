import Axios from "axios";
import CollectionCache from "./collection/CollectionCache.js";
import Context from "./Context.js";
import TrackCache from "./music/TrackCache.js";
import HostInfo from "./HostInfo.js";
import V1 from "./version/V1.js";
import Cryptico from "./Crypto.js";
import CryptoJS from "crypto-js";
import { BufferShim } from "buffer-esm";


export interface PipeBombOptions {
    token?: string,
    privateKey?: string,
    CollectionCacheTime?: number,
    playlistUpdateFrequency?: number,
    trackCacheTime?: number,
    includeAddressInIds?: boolean
}

export default class PipeBomb {
    public readonly context: Context;
    public readonly collectionCache: CollectionCache;
    public readonly trackCache: TrackCache;

    public readonly v1: V1;

    constructor(serverURL: string, options?: PipeBombOptions) {
        this.context = new Context(serverURL, this, options);

        this.trackCache = new TrackCache(this.context, options?.trackCacheTime ?? 60);
        this.collectionCache = new CollectionCache(this.context, this.trackCache, options?.CollectionCacheTime ?? 600);

        this.v1 = new V1(this.context, this.trackCache, this.collectionCache);
    }

    public async authenticate(username: string, options?: {
        privateKey?: string,
        createIfMissing?: boolean
    }) {
        let privateKey = options?.privateKey;
        if (privateKey) {
            this.context.setPrivateKey(options.privateKey);
        } else {
            privateKey = this.context.getPrivateKey();
            if (!privateKey) {
                throw `Pipe Bomb instance has not been assigned a private key`;
            }
        }

        this.context.setUsername(username);

        const key = Cryptico.RSAKey.parse(BufferShim.from(privateKey, "base64").toString("utf-8"));

        const publicKey: string = Cryptico.publicKeyString(key);
        const userID = PipeBomb.getUserIDFromPublicKey(publicKey);

        const response = await this.context.makeRequest("post", "v1/login", {
            user_id: userID,
            public_key: publicKey,
            create_if_missing: !!options?.createIfMissing
        });

        if (response.statusCode != 200 || typeof response.response?.secret != "string") throw response;

        const secret: string = response.response.secret;
        const decrypted = PipeBomb.decrypt(secret, privateKey);
        
        const tokenResponse = await this.context.makeRequest("post", "v1/authenticate", {
            user_id: userID,
            username,
            secret: decrypted
        });

        if (tokenResponse.statusCode != 200 || typeof tokenResponse.response?.token != "string") throw tokenResponse;

        const token: string = tokenResponse.response.token;
        this.context.setToken(token);
        return token;
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

    public static getCredentialHash(username: string, password: string) {
        const passwordHash = CryptoJS.SHA256(password).toString();
        const usernameHash = CryptoJS.SHA256(username).toString();
        const hash = CryptoJS.SHA256(passwordHash + usernameHash).toString();
        return hash;
    }

    public static getUserIDFromPublicKey(publicKey: string): string {
        return Cryptico.publicKeyID(publicKey);
    }

    public static generatePrivateKey(accountHash: string) {
        const privateKeyJson = Cryptico.generateRSAKey(accountHash, 2048);
        const privateKey = BufferShim.from(JSON.stringify(privateKeyJson.toJSON())).toString("base64");
        return privateKey;
    }

    public static getAccountKeys(privateKey: string) {
        const privateKeyJson = Cryptico.RSAKey.parse(BufferShim.from(privateKey, "base64").toString("utf-8"));
        const publicKey: string = Cryptico.publicKeyString(privateKeyJson);

        return {
            publicKey,
            userID: this.getUserIDFromPublicKey(publicKey)
        };
    }

    public static encrypt(message: JSON | string, publicKey: string): string {
        try {
            if (typeof message == "object") {
                message = JSON.stringify(message);
            }
        } catch {}

        const response = Cryptico.encrypt(message, publicKey);
        if (response.status != "success") throw `Failed to encrypt payload with public key`;
        return response.cipher;
    }

    public static decrypt(message: string, privateKey: string): JSON | string {
        const key = Cryptico.RSAKey.parse(BufferShim.from(privateKey, "base64").toString("utf-8"));

        const response = Cryptico.decrypt(JSON.stringify(message), key);
        if (response.status != "success") throw `Failed to decrypt payload with private key`;
        try {
            if (response.plaintext.startsWith("[") || response.plaintext.startsWith("{")) {
                return JSON.parse(response.plaintext);
            }
        } catch {}
        return response.plaintext;
    }
}