export default class Response {
    public readonly statusCode: number;
    public readonly statusMessage: string;
    public readonly response: any;

    public constructor(statusCode: number, statusMessage: string, response: any) {
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.response = response;
    }
}