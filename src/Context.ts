import Request from "./Request.js";
import Response from "./Response.js";

export default class Context {

    public constructor(public serverURL: string, public token: string, public readonly playlistUpdateFrequency: number) {}

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
}