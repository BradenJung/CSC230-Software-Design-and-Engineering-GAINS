// client/src/pages/auth/login.jsx
import { useState } from "react";
import { login } from "../../lib/authClient";

export default function LoginPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      const user = await login(email, password);
      setOk(`Signed in as ${user.email}`);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: 16 }}>
      <h1>Sign in</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {ok && <p style={{ color: "green" }}>{ok}</p>}
        <button type="submit" style={{ padding: "8px 12px" }}>
          Sign in
        </button>
      </form>
    </main>
  );
}
