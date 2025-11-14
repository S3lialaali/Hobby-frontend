//rest wrapper for instructors route
import { get, post, put, del} from "./client";

const base = "/api/instructors";

function appendQuery(path, params) {
  if (!params) return path;
  if (typeof params === "string") {
    return params ? (params.startsWith("?") ? `${path}${params}` : `${path}?${params}`) : path;
  }
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `${path}?${q}` : path;
}

export function fetchInstructors(params) {
    return get(appendQuery(base, params));
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