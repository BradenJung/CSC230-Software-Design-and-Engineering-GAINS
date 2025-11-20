import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import { apiUrl } from "../lib/api";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    const { name, email, password, confirmPassword } = formState;
    const minLength = 8;
    const hasNumber = /\d/.test(password);

    if (!name || !email || !password || !confirmPassword) {
      setStatus({ type: "error", message: "Please fill out every field." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (password.length < minLength || !hasNumber) {
      setStatus({
        type: "error",
        message: `Password must be at least ${minLength} characters and include a number.`,
      });
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || data.message || "Signup failed");

      setStatus({ type: "success", message: data.message || "Signup successful!" });
      setFormState(initialState);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  return (
    <>
      <Head>
        <title>Create account · GAINS Toolkit</title>
      </Head>

      <Header />

      <div className={styles.dashboard}>
        <section className={styles.authLayout}>
          <aside className={styles.authIntro}>
            <h1>Join the GAINS community</h1>
            <p>Set up your account to unlock collaborative analytics and guided R tooling.</p>
            <ul className={styles.authBenefits}>
              <li>Create and save custom tool configurations</li>
              <li>Collaborate with classmates in shared workspaces</li>
              <li>Export reproducible code in a single click</li>
            </ul>
          </aside>

          <div className={styles.authCard}>
            <form onSubmit={handleSubmit} className={styles.authForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="name" className={styles.inputLabel}>
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jordan Gaines"
                  value={formState.name}
                  onChange={handleChange}
                  className={styles.inputField}
                  required
                />
              </div>

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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formState.password}
                  onChange={handleChange}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.inputLabel}>
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formState.confirmPassword}
                  onChange={handleChange}
                  className={styles.inputField}
                  required
                />
              </div>

              <button type="submit" className={styles.submitButton}>
                Create account
              </button>
            </form>

            {status && (
              <p
                className={`${styles.statusMessage} ${status.type === "success" ? styles.statusSuccess : styles.statusError
                  }`}
              >
                {status.message}
              </p>
            )}

            <div className={styles.supportLinks}>
              <Link href="/login">Already have an account?</Link>
              <Link href="/linear-regression">Explore the tools</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
