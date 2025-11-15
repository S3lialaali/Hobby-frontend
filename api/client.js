//fetch client for the app
import { loadRefreshToken, saveRefreshToken, clearRefreshToken} from "../sessions/storage";

export const API_BASE_URL = "http://192.168.100.22:3000"; // ← change if your LAN IP changes

//toggles for DEV logs
const LOG = {
  req: false,     // request lines
  ok:  false,     // success payloads
  err: true,      // errors (keep on)
  refresh: false, // refresh flow logs
};

export function resolveImageUrl(u) {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

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

//refresh state
let isRefreshing = false;
let queue = []; // {resolve, reject, path, opts}

//call /auth/refresh directly
async function doRefresh() {
    const stored = await loadRefreshToken();
    if (!stored) throw new Error("no_refresh_token");

    const url = `${API_BASE_URL}/auth/refresh`;
    //if (__DEV__ && LOG.refresh) console.log("[API REFRESH ->] POST", url);

    const response = await withTimeout(DEFAULT_TIMEOUT_MS, (signal) =>
        fetch(url, {
            method: "POST",
            signal,
            headers: {"Content-type": "application/json"},
            body: JSON.stringify({ refreshToken: stored })
        })
    );

    const ct = response.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        //if (__DEV__ && LOG.refresh) console.log("[API REFRESH ERR]", response.status, data);
        const msg = typeof data === "string" ? data : (data?.error || data?.message || `HTTP ${response.status}`);
        const err = new Error(msg);
        err.status = response.status;
        err.data = data;
        throw err;
    }

    if (__DEV__ && LOG.refresh) console.log("[API REFRESH OK]", data);
    setAccessToken(data.accessToken);
    await saveRefreshToken(data.refreshToken);
    return data.accessToken;
}

async function processQueue(err, newAccess) {
    const pending = queue;
    queue = [];
    pending.forEach(({ resolve, reject, path, opts }) => {
        if (newAccess) resolve(request(path, opts));
        else reject(err);
    });
}

//request wrapper 
async function request(path, opts = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        timeoutMS = DEFAULT_TIMEOUT_MS,
    } = opts;

    const url = `${API_BASE_URL}${path}`;
    //logging info for devs in console
    if (__DEV__) console.log("[API ->]" , method, url);

    return withTimeout(timeoutMS, async (signal) => {
        //send json and add auth if you have access token
        const h = { "Content-Type": "application/json", ...headers};
        const token = getAccessToken();
        if(token) h.Authorization = `Bearer ${token}`;

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

        const isAuthEndpoint = 
        path.startsWith("/auth/login") ||
        path.startsWith("/auth/register") ||
        path.startsWith("/auth/register-business") ||
        path.startsWith("/auth/refresh") ||
        path.startsWith("/auth/logout");

    if (response.status === 401 && !isAuthEndpoint) {
        if (isRefreshing) {
            return new Promise((resolve, reject) =>
            queue.push({ resolve, reject, path, opts}));
        }
        isRefreshing = true;
        try {
            const newAccess = await doRefresh();
            await processQueue(null, newAccess);
            const retryHeader = {...headers, Authorization: `Bearer ${newAccess}`};
            return request(path, {method, body, header: retryHeaders, timeoutMS});
        } catch (err) {
            await processQueue(err, null);
            clearAccessToken();
            const msg = typeof data === "string" ? data : (data?.error || data?.message || "HTTP 401");
            const error = new Error(msg);
            error.status = 401;
            error.data = data;
            throw err;
        } finally {
            isRefreshing = false;
        }
   }

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
        //if (__DEV__) console.log("[API OK]", method, url, data);
        return data;
    });
}

//convenient methods for requests
export function get(path, headers) { return request(path, { method: "GET", headers }); }
export function post(path, body, headers) { return request(path, { method: "POST", body, headers }); }
export function put(path, body, headers) { return request(path, { method: "PUT", body, headers }); }
export function patch(path, body, headers) { return request(path, { method: "PATCH", body, headers }); }
export function del(path, headers) { return request(path, { method: "DELETE", headers }); }

//error message for UI
export function getApiError(err) {
    if (err?.data?.error) return err.data.error;
    if (err?.data?.message) return err.data.message;
    if (typeof err?.message === "string") return err.message;
    return "Request failed";
}