import Request from "./Request.js";
export default class Context {
    constructor(serverURL, token) {
        this.serverURL = serverURL;
        this.token = token;
    }
    makeRequest(method, endpoint, body) {
        return new Promise((resolve, reject) => {
            try {
                const request = new Request(method, `${this.serverURL}/${endpoint}`, this.token, body || {});
                request.addSuccessHandler(response => {
                    resolve(response);
                });
            }
            catch (e) {
                console.error("error", e);
                reject(e);
            }
        });
    }
}
//# sourceMappingURL=Context.js.map