// client/src/pages/auth/login.jsx
import { useState } from "react";
import { login } from "../../lib/authClient"; // make sure this path is correct
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();              // stop default form post
    setErr(""); setOk("");
    try {
      const user = await login(email, password);  // calls /api/auth/login
      setOk(`Signed in as ${user.email}`);
      // e.g. router.push("/profile");
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: 16 }}>
      <h1>Sign in</h1>
      {/* IMPORTANT: no action=... here */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <span>Email</span>
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {ok && <p style={{ color: "green" }}>{ok}</p>}
        <button type="submit">Sign in</button>
        <p style={{ fontSize: 14 }}>
          No account? <Link href="/auth/signup">Create one</Link>
        </p>
      </form>
    </main>
  );
}
