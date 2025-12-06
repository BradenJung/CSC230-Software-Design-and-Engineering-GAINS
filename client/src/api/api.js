const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const jsonHeaders = { "Content-Type": "application/json" };

async function request(path, payload) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload ?? {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export async function signup(body) {
  return request("signup", body);
}

export async function login(body) {
  return request("login", body);
}

export async function logout(body) {
  return request("logout", body);
}
