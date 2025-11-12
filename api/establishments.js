//rest wrapper for establishment routes
import { get, post, put, del } from "./client";

const base = "/api/establishments";

//query helper
const qs = (p = {}) =>
    Object.entries(p)
    .filter(([, v]) => v !== undefined && v !==null && v !=="")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

//GET api/establishment
export function fetchEstablishments(params = {}) {
    const q = qs(params);
    return get(`${base}${q ? `${q}` : ""}`);
}

export function fetchEstablishmentsByCategory(category, params = {}) {
    const q = qs(params);
    return get(`${base}/category/${encodeURIComponent(category)}${q ? `${q}` : ""}`);
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