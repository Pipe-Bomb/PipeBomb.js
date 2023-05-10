import Axios from "axios";

export default class ServerInfo {
    private status: "secure" | "insecure" | "offline" = "offline";

    public constructor(
        public readonly address: string,
        public readonly name: string,
        https: boolean,
        public readonly uptime: number
    ) {
        this.status = https ? "secure" : "insecure";
    }

    public getUrl() {
        return `http${this.status == "secure" ? "s" : ""}://${this.address}`;
    }

    public async getLatency(timeout?: number): Promise<number | null> {
        const url = this.getUrl() + "/v1/identify";
        let total = 0;
        try {
            for (let i = 0; i < 5; i++) {
                const start = Date.now();
                const { data } = await Axios.get(url, {
                    timeout: timeout || 3000
                });
                if (!data?.response.pipeBombServer) throw "not pipe bomb server";
                total += Date.now() - start;
            }
        } catch {
            this.status = "offline";
            return null;
        }
        return Math.round(total / 5);
    }

    public getStatus() {
        return this.status;
    }
}