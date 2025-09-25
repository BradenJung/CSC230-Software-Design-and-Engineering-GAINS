import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const initialState = { email: "", password: "" };

export default function Login() {
  const [formState, setFormState] = useState(initialState);
  // Surface lightweight feedback until backend wiring is complete
  const [status, setStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.email || !formState.password) {
      setStatus({ type: "error", message: "Please enter your email and password." });
      return;
    }

    // Placeholder success message; swap once API integration is implemented
    setStatus({
      type: "success",
      message: "Form submitted. Your team can hook this into the backend when ready.",
    });
  };

  return (
    <>
      <Head>
        <title>Sign in · GAINS Toolkit</title>
      </Head>

      <Header />

      <div className={styles.dashboard}>
        {/* Global header already renders navigation; keep only the auth layout here */}
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
              <Link href="/linear-regression">Preview the tools</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
