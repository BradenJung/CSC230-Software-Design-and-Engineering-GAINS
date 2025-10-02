import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const [formState, setFormState] = useState(initialState);
  // Provide temporary messaging until the signup endpoint is live
  const [status, setStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formState.name || !formState.email || !formState.password || !formState.confirmPassword) {
      setStatus({ type: "error", message: "Please fill out every field." });
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    // Placeholder success message so backend integration can slot in later
    setStatus({
      type: "success",
      message: "Signup submitted. Connect this form to the backend to finalize onboarding.",
    });
  };

  return (
    <>
      <Head>
        <title>Create account · GAINS Toolkit</title>
      </Head>

      <div className={styles.home}>
        <Header />

        <main className={styles.authMain}>
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
                  className={`${styles.statusMessage} ${
                    status.type === "success" ? styles.statusSuccess : styles.statusError
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
        </main>
      </div>
    </>
  );
}
