//rest wrapper for instructors route
import { get, post, put, del} from "./client";

const base = "/api/instructors";

const qs = (p = {}) =>
    Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== null & v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export function fetchInstructors(params = {}) {
    const q = qs(params);
    return get(`${base}${q ? `?${q}` : ""}`);
}

export function fetchInstructorsByActivity(activityId) {
    return get(`${base}/by-activity/${activityId}`);
}

export function fetchInstructorById(id) {
    return get(`${base}/${id}`);
}

export function createInstructor(payload) {
    return post(base, payload);
}

export function updateInstructor(id, payload) {
    return put(`${base}/${id}`, payload);
}

export function deleteInstructor(id) {
    return del(`${base}/${id}`);
}