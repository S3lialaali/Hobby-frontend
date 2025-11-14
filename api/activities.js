//rest wrapper for activities route
import { get, post, put, del } from "./client";

const base = "/api/activities";

function appendQuery(path, params) {
  if (!params) return path;
  if (typeof params === "string") {
    if (!params.length) return path;
    return params.startsWith("?") ? `${path}${params}` : `${path}?${params}`;
  }
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `${path}?${q}` : path;
}

export function fetchActivities(params) {
    return get(appendQuery(base, params));
}

export function fetchActivityById(id) {
    return get(`${base}/${id}`);
}

export function createActivity(payload) {
    return post(base, payload);
}

export function fetchSchedulesByActivity(activityId, params = {}) {
    const q = appendQuery("/api/activity_schedules", { activity_id: activityId, ...params });
    return get(q);
}