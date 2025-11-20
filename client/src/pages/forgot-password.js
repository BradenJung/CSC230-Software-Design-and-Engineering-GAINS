import Head from "next/head";
import { useState } from "react";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import { apiUrl } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState(null);

  const minLength = 8;

  async function handleRequestCode(e) {
    e.preventDefault();
    setStatus(null);

    if (!email) {
      setStatus({ type: "error", message: "Enter the email for your account." });
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send reset code.");
      setStatus({ type: "success", message: data.message || "Reset code sent. Check your email." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setStatus(null);

    if (!email || !resetCode || !newPassword) {
      setStatus({ type: "error", message: "Fill in email, reset code, and new password." });
      return;
    }

    if (newPassword.length < minLength || !/\d/.test(newPassword)) {
      setStatus({
        type: "error",
        message: `Password must be at least ${minLength} characters and include a number.`,
      });
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: resetCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset password.");
      setStatus({ type: "success", message: data.message || "Password updated. You can log in now." });
      setNewPassword("");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  return (
    <>
      <Head>
        <title>Forgot password · GAINS</title>
      </Head>
      <Header />
      <div className={styles.dashboard}>
        <section className={styles.authLayout}>
          <aside className={styles.authIntro}>
            <h1>Reset your password</h1>
            <p>Request a reset code and set a new password with it. Codes expire in 15 minutes.</p>
            <ul className={styles.authBenefits}>
              <li>Enter the email on your account</li>
              <li>Use the reset code we return (prototype)</li>
              <li>Choose a strong new password</li>
            </ul>
          </aside>
          <div className={styles.authCard}>
            <form onSubmit={handleRequestCode} className={styles.authForm}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="email">
                  Account email
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.inputField}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                Send reset code
              </button>
            </form>

            <form onSubmit={handleResetPassword} className={styles.authForm} style={{ marginTop: "20px" }}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="resetCode">
                  Reset code
                </label>
                <input
                  id="resetCode"
                  type="text"
                  className={styles.inputField}
                  placeholder="6-character code"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className={styles.inputField}
                  placeholder="Minimum 8 chars, include a number"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.submitButton}>
                Reset password
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
          </div>
        </section>
      </div>
    </>
  );
}
