//rest wrapper for booking routes
import { get, post, put, del } from "./client";

const base = "/api/bookings";

const qs = (p = {}) =>
    Object.entries(p)
    .filter(([, v]) => v !==undefined && v !==null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export function fetchBookings(params = {}) {
    const q = qs(params);
    return get(`${base}${q ? `?${q}` : ""}`);
}

export function fetchBookingById(id) {
    return get(`${base}/${id}`);
}

export function createBooking(payload) {
    return post(base, payload);
}

export function updateBooking(id, patch) {
    return put(`${base}/${id}`, patch);
}