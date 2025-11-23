// Rest wrapper for moderation routes
import { get, post } from "./client";

const base = "/api/moderation";

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

// Fetch moderation logs with optional filters (admin_user_id, entity_type, entity_id, limit, offset)
export function fetchModerationLogs(params) {
  return get(appendQuery(base, params));
}

// Fetch a single moderation log by id
export function fetchModerationLogById(id) {
  return get(`${base}/${id}`);
}

// Create a moderation log
export function createModerationLog(payload) {
  return post(base, payload);
}
