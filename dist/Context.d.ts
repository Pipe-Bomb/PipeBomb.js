import Response from "./Response.js";
export default class Context {
    protected readonly serverURL: string;
    protected readonly token: string;
    constructor(serverURL: string, token: string);
    makeRequest(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", endpoint: string, body?: any): Promise<Response>;
}
