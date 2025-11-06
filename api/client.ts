import axios from "axios";

const BASE_URL = "http://172.20.10.2:3000" //http://<YOUR-LAN-IP>:3000

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

//helper for backend errors
export function getApiError(error:any): string {
    const data = error?.repsonse?.data;
    if (!data) return error?.message ?? "Network error";
    if (typeof data === "string") return data;
    return data.error || data.nessage || "Request failed";
}