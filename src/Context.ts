import Request from "./Request.js";
import Response from "./Response.js";

export default class Context {
    protected readonly serverURL: string;
    protected readonly token: string;

    public constructor(serverURL: string, token: string) {
        this.serverURL = serverURL;
        this.token = token;
    }

    public makeRequest(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", endpoint: string, body?: any): Promise<Response> {
        return new Promise((resolve, reject) => {
            try {
                const request = new Request(method, `${this.serverURL}/${endpoint}`, this.token, body || {});
                request.addSuccessHandler(response => {
                    resolve(response);
                });
            } catch (e) {
                console.error("error", e);
                reject(e);
            }
        });
    }
}