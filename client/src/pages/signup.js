import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const initialState = {
  accountName: "",
  password: "",
  confirmPassword: "",
};

const ACCOUNTS_STORAGE_KEY = "gains.accounts";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";

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

export default function Signup() {
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

    if (!formState.accountName || !formState.password || !formState.confirmPassword) {
      setStatus({ type: "error", message: "Please fill out every field." });
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
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

    const trimmedAccountName = formState.accountName.trim();
    const normalizedAccountName = trimmedAccountName.toLowerCase();

    if (accounts[normalizedAccountName]) {
      setStatus({ type: "error", message: "That account name is already taken." });
      return;
    }

    accounts[normalizedAccountName] = {
      accountName: trimmedAccountName,
      password: formState.password,
      createdAt: new Date().toISOString(),
    };

    storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    storage.setItem(ACTIVE_ACCOUNT_KEY, trimmedAccountName);

    setStatus({
      type: "success",
      message: "Account created. You can now sign in with your credentials.",
    });
    setFormState(initialState);
    notifyBackend("/api/auth/signup", { accountName: trimmedAccountName });
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
