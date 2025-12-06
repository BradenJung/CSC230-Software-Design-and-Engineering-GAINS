import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import AccessibilityButton from "../components/AccessibilityButton";
import CodexTool from "../components/CodexTool";
import { login as loginRequest } from "../api/api";
import { useRouter } from "next/router";

const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";

const initialState = { email: "", password: "" };

const AUTH_CHANGE_EVENT = "gains-auth-change";

export default function Login() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState(null);
  const router = useRouter();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setStatus(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { email, password } = formState;
    if (!email || !password) {
      setStatus({ type: "error", message: "Please enter your email and password." });
      return;
    }

    try {
      const data = await loginRequest({ email: email.trim(), password });
      const resolvedAccount = data.user?.name || data.user?.email || email.trim();

      if (typeof window !== "undefined" && resolvedAccount) {
        window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, resolvedAccount);
        window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { accountName: resolvedAccount } }));
      }

      setStatus({
        type: "success",
        message: "Login successful. Redirecting...",
      });
      setFormState(initialState);
      router.push("/dashboard");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · GAINS Toolkit</title>
      </Head>

      <div className={styles.home}>
        <Header />

        <main className={styles.authMain}>
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
                <Link href="/forgot-password">Forgot password</Link>
                <Link href="/dashboard">Preview the tools</Link>
              </div>
            </div>
          </section>
        </main>
        {/*Adds Accessibility Button to page */}
      <AccessibilityButton />
      {/*Adds Chat Option to the current page */}
      <CodexTool />
      </div>
    </>
  );
}
