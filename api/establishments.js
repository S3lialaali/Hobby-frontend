//rest wrapper for establishment routes
import { get, post, put, del } from "./client";

const base = "/api/establishments";

//accept either object or string
function appendQuery(path, params) {
  if (!params) return path;

  // If caller passed a string make sure it has ? in the start
  if (typeof params === "string") {
    if (!params.length) return path;
    return params.startsWith("?") ? `${path}${params}` : `${path}?${params}`;
  }
  // Otherwise build from object
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  return q ? `${path}?${q}` : path;
}

//GET api/establishment
export function fetchEstablishments(params = {}) {
    return get(appendQuery(base, params));
}

export function fetchEstablishmentsByCategory(category, params = {}) {
    const path = `{base}/category/${encodeURIComponent(category)}`;
    return get(appendQuery(path, params));
}

export function fetchEstablishmentById(id) {
    return get(`${base}/${id}`);
}

export function clickEstablishment(id) {
    return post(`${base}/${id}/click`);
}

export function rateEstablishment(id, payload ) {
    return post(`${base}/${id}/rate` , payload);
}

export function createEstablishment(payload) {
    return post(base, payload);
}

export function updateEstablishment(id, payload) {
    return put(`${base}/${id}`, payload);
}

export function fetchEstablishmentReviews(id, params = {}) {
  const path = `${base}/${id}/reviews`;
  return get(appendQuery(path, params));
}

// POST /api/establishments/:id/reviews
// payload: { user_id: number, rating: 1..5, comment?: string }
export function createEstablishmentReview(id, payload) {
  return post(`${base}/${id}/reviews`, payload);
}