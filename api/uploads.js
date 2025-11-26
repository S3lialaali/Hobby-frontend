// Image upload helpers for establishments, activities, and instructors
import { API_BASE_URL, getAccessToken, getApiError } from "./client";

function buildFormData(uri, fallbackNamePrefix) {
  const nameFromUri = uri.split("/").pop() || `${fallbackNamePrefix}.jpg`;
  const match = nameFromUri.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? match[1].toLowerCase() : "jpg";

  let mime = "image/jpeg";
  if (ext === "png") mime = "image/png";
  else if (ext === "webp") mime = "image/webp";

  const fd = new FormData();
  fd.append("image", {
    // @ts-ignore - React Native FormData file
    uri,
    name: nameFromUri,
    type: mime,
  });

  return fd;
}

async function doUpload(path, uri) {
  const token = getAccessToken();
  if (!token) {
    const err = new Error("not_authenticated");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const formData = buildFormData(uri, "upload");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // ❗ Do NOT set Content-Type manually; RN will set multipart boundary
    },
    body: formData,
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const wrapped = { data };
    const msg = getApiError(wrapped);
    const err = new Error(msg || "Upload failed");
    // @ts-ignore
    err.status = res.status;
    // @ts-ignore
    err.data = data;
    throw err;
  }

  return data;
}

export function uploadEstablishmentImage(establishmentId, uri) {
  return doUpload(`/api/uploads/establishments/${establishmentId}/image`, uri);
}

export function uploadActivityImage(activityId, uri) {
  return doUpload(`/api/uploads/activities/${activityId}/image`, uri);
}

export function uploadInstructorImage(instructorId, uri) {
  return doUpload(`/api/uploads/instructors/${instructorId}/image`, uri);
}
