// ---------- Base URL (use your laptop's LAN IP) ----------
export const API_BASE_URL = "http://192.168.100.22:3000"; // ← change if your LAN IP changes

export function resolveImageUrl(u) {
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

// Build query strings from an object
function qs(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

/* ============================
   Low-level fetch helpers
============================ */
async function parseBody(res) {
  const ct = res.headers.get("content-type") || "";
  // Prefer JSON if content-type says so
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // fall through to text if parsing fails
    }
  }
  try {
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

function toErrorObject(status, body) {
  // Normalize server JSON error shapes or plain text/html into a consistent object
  if (body && typeof body === "object") {
    const { error, message, code, ...rest } = body;
    return {
      error: error || true,
      status,
      code: code || (typeof error === "string" ? error : undefined),
      message: message || (typeof error === "string" ? error : undefined),
      data: rest,
    };
  }
  return {
    error: true,
    status,
    message: typeof body === "string" ? body : "Request failed",
    data: null,
  };
}

// GET helper (JSON)
async function getJSON(url) {
  try {
    const res = await fetch(url);
    const body = await parseBody(res);
    if (!res.ok) {
      console.error("API GET error:", url, res.status, body);
      return null;
    }
    // If body was text but endpoint should be JSON, try to JSON.parse it, otherwise return null
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        console.error("API GET non-JSON body:", body?.slice?.(0, 200));
        return null;
      }
    }
    return body ?? null;
  } catch (err) {
    console.error("API GET error:", err);
    return null;
  }
}

// POST/PATCH/DELETE helper (JSON in/out) — always returns an object
async function sendJSON(url, method, bodyObj) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: bodyObj ? JSON.stringify(bodyObj) : undefined,
    });
    const body = await parseBody(res);

    if (!res.ok) {
      const errObj = toErrorObject(res.status, body);
      // Keep original server "error" field (e.g., "duplicate_booking") for easy checks
      return errObj;
    }

    // Success responses
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        // Some endpoints might return empty body or plain text success
        return { ok: true, data: body };
      }
    }
    return body ?? { ok: true };
  } catch (err) {
    console.error(`API ${method} error:`, err);
    return { error: true, status: 0, message: String(err) };
  }
}

/* =========================================================
 * ESTABLISHMENTS
 * =======================================================*/

export async function fetchEstablishments(params = {}) {
  const url = `${API_BASE_URL}/api/establishments${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

export async function fetchEstablishmentsByCategory(category, params = {}) {
  const url = `${API_BASE_URL}/api/establishments/category/${encodeURIComponent(
    category
  )}${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

export async function fetchEstablishmentById(id) {
  const url = `${API_BASE_URL}/api/establishments/${id}`;
  return (await getJSON(url)) ?? null;
}

export async function clickEstablishment(id) {
  const url = `${API_BASE_URL}/api/establishments/${id}/click`;
  return await sendJSON(url, "POST");
}

export async function rateEstablishment(id, rating) {
  const url = `${API_BASE_URL}/api/establishments/${id}/rate`;
  return await sendJSON(url, "POST", { rating });
}

export async function createEstablishment(payload) {
  const url = `${API_BASE_URL}/api/establishments`;
  return await sendJSON(url, "POST", payload);
}

export async function updateEstablishment(id, patch) {
  const url = `${API_BASE_URL}/api/establishments/${id}`;
  return await sendJSON(url, "PATCH", patch);
}

/* =========================================================
 * ACTIVITIES
 * =======================================================*/

export async function fetchActivities(establishmentId) {
  const url = `${API_BASE_URL}/api/activities${qs({
    establishment_id: establishmentId,
  })}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

export async function fetchActivityById(id) {
  const url = `${API_BASE_URL}/api/activities/${id}`;
  return (await getJSON(url)) ?? null;
}

export async function createActivity(payload) {
  const url = `${API_BASE_URL}/api/activities`;
  return await sendJSON(url, "POST", payload);
}

/* =========================================================
 * ACTIVITY SCHEDULES
 * =======================================================*/

export async function fetchSchedulesByActivity(activityId, params = {}) {
  const url = `${API_BASE_URL}/api/activity_schedules${qs({
    activity_id: activityId,
    ...params,
  })}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/* =========================================================
 * INSTRUCTORS
 * =======================================================*/

export async function fetchInstructors(params = {}) {
  const url = `${API_BASE_URL}/api/instructors${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

export async function fetchInstructorsByActivity(activityId) {
  const url = `${API_BASE_URL}/api/instructors/by-activity/${activityId}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

export async function fetchInstructorById(id) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return (await getJSON(url)) ?? null;
}

export async function createInstructor(payload) {
  const url = `${API_BASE_URL}/api/instructors`;
  return await sendJSON(url, "POST", payload);
}

export async function updateInstructor(id, patch) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return await sendJSON(url, "PATCH", patch);
}

export async function deleteInstructor(id) {
  const url = `${API_BASE_URL}/api/instructors/${id}`;
  return await sendJSON(url, "DELETE");
}

/* =========================================================
 * BOOKINGS
 * =======================================================*/

/**
 * GET /api/bookings?user_id=&activity_id=&status=
 * status ∈ {"confirmed","expired","cancelled"}
 */
export async function fetchBookings(params = {}) {
  const url = `${API_BASE_URL}/api/bookings${qs(params)}`;
  const data = await getJSON(url);
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/bookings
 * Required for capacity checks:
 *   - user_id
 *   - activity_id
 *   - schedule_id
 *   - booked_for: "YYYY-MM-DD HH:MM:SS"
 * Optional:
 *   - people_count (default 1)
 *   - status: "confirmed"|"expired"|"cancelled" (default "confirmed")
 *
 * Returns either a booking row or `{ error, status, code, message }`
 *  - e.g. duplicate booking → { error: true, status: 409, code: "duplicate_booking" }
 */
export async function createBooking(payload) {
  const url = `${API_BASE_URL}/api/bookings`;
  return await sendJSON(url, "POST", payload);
}

/** PATCH /api/bookings/:id  (update people_count, booked_for, status, schedule_id) */
export async function updateBooking(id, patch) {
  const url = `${API_BASE_URL}/api/bookings/${id}`;
  return await sendJSON(url, "PATCH", patch);
}

/** GET /api/bookings/:id */
export async function fetchBookingById(id) {
  const url = `${API_BASE_URL}/api/bookings/${id}`;
  return (await getJSON(url)) ?? null;
}
