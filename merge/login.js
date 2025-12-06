import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import { useRouter } from "next/router";

const initialState = { email: "", password: "" };

export default function Login() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState(null);

  const router = useRouter();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
  
    const { email, password } = formState;
  
    try {
      const res = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
  
      if (!res.ok) throw new Error(data.error || "Login failed");
  
      // Optional: save logged-in user
      // localStorage.setItem("user", JSON.stringify(data.user));
  
      // Redirect after login
      router.push("/dashboard");
  
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }  

  return (
    <>
      <Head>
        <title>Sign in · GAINS Toolkit</title>
      </Head>

      <Header />

      <div className={styles.dashboard}>
        <section className={styles.authLayout}>
          <aside className={styles.authIntro}>
            <h1>Welcome back</h1>
            <p>Access personalized analytics, saved workspaces, and collaborative tools.</p>
            <ul className={styles.authBenefits}>
              <li>Continue where you left off</li>
              <li>Share insights with teammates</li>
              <li>Download R-ready code snippets</li>
            </ul>
          </aside>

          <div className={styles.authCard}>
            <form onSubmit={handleSubmit} className={styles.authForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formState.email}
                  onChange={handleChange}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.inputLabel}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={formState.password}
                  onChange={handleChange}
                  className={styles.inputField}
                  required
                />
              </div>

              <button type="submit" className={styles.submitButton}>
                Sign in
              </button>
            </form>

            {status && (
              <p
                className={`${styles.statusMessage} ${
                  status.type === "success" ? styles.statusSuccess : styles.statusError
                }`}
              >
                {status.message}
              </p>
            )}

            <div className={styles.supportLinks}>
              <Link href="/signup">Need an account?</Link>
              <Link href="/dashboard">Preview the tools</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

