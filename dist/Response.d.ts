export default class Response {
    readonly statusCode: number;
    readonly statusMessage: string;
    readonly response: any;
    constructor(statusCode: number, statusMessage: string, response: any);
}
