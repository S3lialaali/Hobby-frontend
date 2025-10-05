
// ---------- Base URL (use your laptop's LAN IP) ----------
export const API_BASE_URL = "http://192.168.100.22:3000"; // ← change if your LAN IP changes

export function resolveImageUrl(u) {
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

// Small helper to build query strings from an object
function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

// Standardized 
async function getJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("API GET error:", err);
    return null;
  }
}

async function sendJSON(url, method, bodyObj) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: bodyObj ? JSON.stringify(bodyObj) : undefined,
    });
    // Server always returns JSON (success or error)
    return await res.json();
  } catch (err) {
    console.error(`API ${method} error:`, err);
    return { error: true };
  }
}

/* =========================================================
 * ESTABLISHMENTS
 * =======================================================*/

/**
 * GET /establishments
 * Params supported by backend:
 *  - q?: string
 *  - category?: string (exact app category or "Other")
 *  - status?: "pending"|"approved"|"rejected" (default "approved")
 *  - order?: "newest"|"rating_desc"|"rating_asc"|"name_asc"|"name_desc"|"clicks_desc"
 *  - limit?: number (default 50)
 *  - offset?: number
 */
export async function fetchEstablishments(params = {}) {
  const url = `${API_BASE_URL}/api/establishments${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/** GET /establishments/category/:category (+ same query params as list) */
export async function fetchEstablishmentsByCategory(category, params = {}) {
  const url = `${API_BASE_URL}/api/establishments/category/${encodeURIComponent(category)}${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/** GET /establishments/:id (returns establishment + activities[] + team[]) */
export async function fetchEstablishmentById(id) {
  const url = `${API_BASE_URL}/api/establishments/${id}`;
  return (await getJSON(url)) ?? null;
}

/** POST /establishments/:id/click (increments clicks) */
export async function clickEstablishment(id) {
  const url = `${API_BASE_URL}/api/establishments/${id}/click`;
  return await sendJSON(url, "POST");
}

/** POST /establishments/:id/rate { rating: 1..5 } */
export async function rateEstablishment(id, rating) {
  const url = `${API_BASE_URL}/api/establishments/${id}/rate`;
  return await sendJSON(url, "POST", { rating });
}

/** POST /establishments (create) — use only if you expose creation in-app */
export async function createEstablishment(payload) {
  const url = `${API_BASE_URL}/api/establishments`;
  return await sendJSON(url, "POST", payload);
}

/** PATCH /establishments/:id (partial update) */
export async function updateEstablishment(id, patch) {
  const url = `${API_BASE_URL}/api/establishments/${id}`;
  return await sendJSON(url, "PATCH", patch);
}


/* =========================================================
 * ACTIVITIES
 * =======================================================*/

/**
 * GET /activities?establishment_id=N
 * Returns all activities for a specific establishment.
 * Each activity may include `image_url` (first image) if your route is set that way.
 */
export async function fetchActivities(establishmentId) {
  const url = `${API_BASE_URL}/api/activities${qs({ establishment_id: establishmentId })}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/**
 * POST /activities
 * Body example:
 * {
 *   establishment_id: number,  // required
 *   title: string,             // required
 *   description?: string,
 *   price?: number,
 *   capacity?: number,
 *   start_datetime?: "YYYY-MM-DD HH:MM:SS",
 *   end_datetime?: "YYYY-MM-DD HH:MM:SS",
 *   schedule?: string,
 *   images?: string[],         // optional list of image paths/URLs
 *   instructor_ids?: number[]  // optional links
 * }
 */
export async function createActivity(payload) {
  const url = `${API_BASE_URL}/api/activities`;
  return await sendJSON(url, "POST", payload);
}


/* =========================================================
 * INSTRUCTORS
 * =======================================================*/

/** GET /instructors?establishment_id=N&q=... */
export async function fetchInstructors(params = {}) {
  const url = `${API_BASE_URL}/api/instructors${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/** GET /instructors/by-activity/:activity_id */
export async function fetchInstructorsByActivity(activityId) {
  const url = `${API_BASE_URL}/api/instructors/by-activity/${activityId}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/** GET /instructors/:id */
export async function fetchInstructorById(id) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return (await getJSON(url)) ?? null;
}

/** POST /instructors */
export async function createInstructor(payload) {
  const url = `${API_BASE_URL}/api/instructors`;
  return await sendJSON(url, "POST", payload);
}

/** PATCH /instructors/:id */
export async function updateInstructor(id, patch) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return await sendJSON(url, "PATCH", patch);
}

/** DELETE /instructors/:id */
export async function deleteInstructor(id) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return await sendJSON(url, "DELETE");
}


/* =========================================================
 * BOOKINGS
 * =======================================================*/

/**
 * GET /bookings?user_id=&activity_id=
 * (All params optional; adjust as needed.)
 */
export async function fetchBookings(params = {}) {
  const url = `${API_BASE_URL}/api/bookings${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/**
 * POST /bookings
 * Body:
 * {
 *   user_id: number,     // required
 *   activity_id: number, // required
 *   people_count?: number,
 *   booked_for?: "YYYY-MM-DD HH:MM:SS"
 * }
 */
export async function createBooking(payload) {
  const url = `${API_BASE_URL}/api/bookings`;
  return await sendJSON(url, "POST", payload);
}

/** GET /bookings/:id */
export async function fetchBookingById(id) {
  const url = `${API_BASE_URL}/api/bookings/${id}`;
  return (await getJSON(url)) ?? null;
}
