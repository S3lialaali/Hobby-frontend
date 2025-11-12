//rest wrapper for activities route
import { get, post, put, del } from "./client";

const base = "/api/activities";

const qs = (p = {}) =>
    Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== null & v !=="")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export function fetchActivities({ establishmentId, ...params } = {}) {
    const q = qs({ establishment_id: establishmentId, ...params});
    return get(`${base}${q ? `?${q}` : ""}`);
}

export function fetchActivityById(id) {
    return get(`${base}/${id}`);
}

export function createActivity(payload) {
    return post(base, payload);
}

export function fetchSchedulesByActivity(activityId, params = {}) {
    const q = qs({ activity_id: activityId, ...params });
    return get(`/api/activity_schedules${q ? `?${q}` : ""}`);
}