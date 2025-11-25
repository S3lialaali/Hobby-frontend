// REST wrapper for activity_schedules routes
import { get, post, put, del } from "./client";

const base = "/api/activity-schedules";

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

// GET /api/activity-schedules?activity_id=...
export function fetchSchedulesByActivity(activityId, params = {}) {
  const q = appendQuery(base, { activity_id: activityId, ...params });
  return get(q);
}

// POST /api/activity-schedules
export function createSchedule(payload) {
  return post(base, payload);
}

// PUT /api/activity-schedules/:id
export function updateSchedule(id, payload) {
  return put(`${base}/${id}`, payload);
}

// DELETE /api/activity-schedules/:id
export function deleteSchedule(id) {
  return del(`${base}/${id}`);
}
