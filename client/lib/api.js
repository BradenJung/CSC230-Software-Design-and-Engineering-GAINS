export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export const apiUrl = (path = "") => `${API_BASE}${path}`;