//rest wrapper for booking routes
import { get, post, patch, del } from "./client";

const base = "/api/bookings";

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

export function fetchBookings(params) {
    return get(appendQuery(base, params));
}

export function fetchBookingById(id) {
    return get(`${base}/${id}`);
}

export function createBooking(payload) {
    return post(base, payload);
}

export function updateBooking(id, body) {
   return patch(`${base}/${id}`, body);
}