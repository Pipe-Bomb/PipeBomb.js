import Response from "./Response.js";
export default class Request {
    private responseHandlers;
    constructor(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", url: string, authorization: string, body?: any);
    addSuccessHandler(callback: (response: Response) => void): this;
    private sendResponse;
}
