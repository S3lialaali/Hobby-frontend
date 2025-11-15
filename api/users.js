//rets wrapper for users routes
import { del, get, post, put } from "./client";

const base = "/api/users";

export function listUsers(params = {}) {
    const qs = (p = {}) =>
        Object.entries(p)
        .filter(([, v]) => v !==undefined && v !==null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    const q = qs(params);
    return get(`${base}${q ? `?${q}` : ""}`);
}

export function getUser(id) {
    return get(`${base}/${id}`);
}

export function createUser(payload) {
    return post(base, payload);
}

export function updateUser(id, payload) {
    return put(`${base}/${id}`, payload);
}

export function deleteUser(id) {
    return del(`${base}/${id}`);
}


export function reportProblem(payload = {}) {
    return post(`${base}/report`, payload);
}

export function fetchReports() {
    return get(`${base}/reports`);
}

export function fetchUserReports(id) {
    return get(`${base}/${id}/reports`);
}

export function fetchUserReviews(id) {
  return get(`${base}/${id}/reviews`);
}