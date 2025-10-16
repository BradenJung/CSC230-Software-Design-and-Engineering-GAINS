async function signupRequest(body) {
  // thanks to next.config rewrites, this hits http://localhost:4000/api/auth/signup
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data; // { message, userId } from your backend
}
