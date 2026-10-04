import { dateKey } from "./dates";

export const API_URL =
  import.meta.env.VITE_API_URL || "https://masterprep-5.onrender.com";

const TOKEN_KEY = "masterprep_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* Fetch wrapper: adds the JWT, parses JSON, throws readable errors */
export async function apiFetch(path, options = {}) {
  // The user's local date, so "due today" follows their calendar, not UTC
  const headers = { "X-Local-Date": dateKey(), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Can't reach the server. It may be waking up, try again in a minute.");
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // FastAPI validation errors come back as a list
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join(", ")
      : data.detail;
    const err = new Error(detail || "Request failed");
    err.status = res.status;
    throw err;
  }

  return data;
}
