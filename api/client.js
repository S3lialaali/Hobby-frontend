//fetch client for the app
const BASE_URL = "http://172.20.10.2:3000"; //http://<your lan ip>:3000

//in memory access token
let _accessToken = null;
export function setAccessToken(t) { _accessToken = t || null; } //call after successful login/signup/refresh
export function getAccessToken() { return _accessToken; }
export function clearAccessToken() { _accessToken = null;}

//helper for timeouts so that requests dont stay forever
const DEFAULT_TIMEOUT_MS = 10000;
function withTimeout(ms, task) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return task(controller.signal).finally(() => clearTimeout(timer));
}

//request wrapper 
async function request(path, opts = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        timeoutMS = DEFAULT_TIMEOUT_MS,
    } = opts;

    const url = `${BASE_URL}${path}`;
    //logging info for devs in console
    if (__DEV__) console.log("[API ->]" , method, url);

    return withTimeout(timeoutMS, async (signal) => {
        //send json and add auth if you have access token
        const h = { "Content-Type": "application/json", ...headers};
        if(_accessToken) h.Authorization = `Bearer ${_accessToken}`;

        const response = await fetch(url, {
            method, 
            signal,
            headers: h,
            body: body ? JSON.stringify(body): undefined
        });

        //try to parse json responses, if not json then fall back to text
        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const data = isJson ? await response.json() : await response.text();

        //error handling
        if (!response.ok) {
            //loggin error info in console
            if (__DEV__) console.log("[API ERR]", method, url, response.status, data);
            const msg = 
                typeof data === "string"
                ? data
                : data?.error || data?.message || `HTTP ${response.status}`;
            const err = new Error(msg);
            err.status = response.status;
            err.data = data;
            throw err;
        }
        //logging success info for devs in console
        if (__DEV__) console.log("[API OK]", method, url, data);
        return data;
    });
}

//convenient methods for requests
export function get(path, headers) { return request(path, { method: "GET", headers }); }
export function post(path, body, headers) { return request(path, { method: "POST", body, headers }); }
export function put(path, body, headers) { return request(path, { method: "PUT", body, headers }); }
export function del(path, headers) { return request(path, { method: "DELETE", headers }); }

//error message for UI
export function getApiError(err) {
    if (err?.data?.error) return err.data.error;
    if (err?.data?.message) return err.data.message;
    if (typeof err?.message === "string") return err.message;
    return "Request failed";
}