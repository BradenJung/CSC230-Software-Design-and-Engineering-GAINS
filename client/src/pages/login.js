import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const ACCOUNTS_STORAGE_KEY = "gains.accounts";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";

const initialState = { accountName: "", password: "" };

const notifyBackend = async (path, payload) => {
  try {
    const response = await fetch(`http://localhost:3000${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Backend ${path} responded with status ${response.status}`);
    }
  } catch (error) {
    console.warn(`Unable to reach backend endpoint ${path}`, error);
  }
};

export default function Login() {
  const [formState, setFormState] = useState(initialState);
  // Provide inline status messaging for the auth flow
  const [status, setStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setStatus(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.accountName || !formState.password) {
      setStatus({ type: "error", message: "Please enter your account name and password." });
      return;
    }

    if (typeof window === "undefined") {
      setStatus({
        type: "error",
        message: "Local storage is not available in this environment.",
      });
      return;
    }

    const storage = window.localStorage;
    let accounts = {};

    try {
      const storedAccounts = storage.getItem(ACCOUNTS_STORAGE_KEY);
      accounts = storedAccounts ? JSON.parse(storedAccounts) : {};
    } catch (error) {
      console.warn("Unable to parse stored account data", error);
      setStatus({ type: "error", message: "Stored account data is corrupted." });
      return;
    }

    const normalizedAccountName = formState.accountName.trim().toLowerCase();
    const existingAccount = accounts[normalizedAccountName];

    if (!existingAccount || existingAccount.password !== formState.password) {
      setStatus({ type: "error", message: "Account name or password is incorrect." });
      return;
    }

    storage.setItem(ACTIVE_ACCOUNT_KEY, existingAccount.accountName);
    setStatus({
      type: "success",
      message: `Welcome back, ${existingAccount.accountName}!`,
    });
    setFormState(initialState);
    notifyBackend("/api/auth/login", { accountName: existingAccount.accountName });
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
                  <label htmlFor="accountName" className={styles.inputLabel}>
                    Account name
                  </label>
                  <input
                    id="accountName"
                    name="accountName"
                    type="text"
                    autoComplete="username"
                    placeholder="your-account-name"
                    value={formState.accountName}
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
        </main>
      </div>
    </>
  );
}
