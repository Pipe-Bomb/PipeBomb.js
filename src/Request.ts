import Axios, { AxiosResponse } from "axios";
import Response from "./Response.js";

export default class Request {
    private responseHandlers: ((response: Response) => void)[] = [];

    constructor(method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch", url: string, authorization: string, body?: any) {

        let request: Promise<AxiosResponse<any, any>>;

        if (["get", "delete"].includes(method)) {
            request = Axios[method](url, {
                headers: {
                    Authorization: authorization || ""
                }
            });
        } else {
            request = Axios[method](url, body, {
                headers: {
                    Authorization: authorization || ""
                }
            })
        }
        
        request.then(
            success => {
                if (success.status == 204) {
                    const response = new Response(204, "No Content", null);
                    for (let callback of this.responseHandlers) {
                        callback(response);
                    }
                    return;
                }
                this.sendResponse(success.data)
            },
            error => {
                if (error?.response?.data?.statusCode) return this.sendResponse(error.response.data);
                const response = new Response(error.errno, error.code, error.cause);
                for (let callback of this.responseHandlers) {
                    callback(response);
                }
            }
        );
        
    }

    public addSuccessHandler(callback: (response: Response) => void): this {
        this.responseHandlers.push(callback);
        return this;
    }

    private sendResponse(data: any): void {
        let response: Response;
        try {
            if (typeof data?.statusCode != "number") throw "Malformed response";
            if (typeof data?.statusMessage != "string") throw "Malformed response";
            if (!("response" in data)) throw "Malformed response";

            response = new Response(data.statusCode, data.statusMessage, data.response);
        } catch (e) {
            response = new Response(500, "Internal Server Error", data);
        }
        
        for (let callback of this.responseHandlers) {
            callback(response);
        }
    }
}