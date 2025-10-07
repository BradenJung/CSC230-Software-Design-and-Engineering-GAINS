import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const AUTH_CHANGE_EVENT = "gains-auth-change";

export default function Header() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncActiveAccount = () => {
      const storage = window.localStorage;
      setActiveAccount(storage.getItem(ACTIVE_ACCOUNT_KEY));
    };

    syncActiveAccount();

    const handleStorage = (event) => {
      if (event.key === ACTIVE_ACCOUNT_KEY) {
        setActiveAccount(event.newValue);
      }
    };

    const handleAuthChange = (event) => {
      if (event.detail && Object.prototype.hasOwnProperty.call(event.detail, "accountName")) {
        setActiveAccount(event.detail.accountName);
        return;
      }

      syncActiveAccount();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!activeAccount) {
      setMenuOpen(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const handleClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [menuOpen]);

  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { accountName: null } }));
    }

    setActiveAccount(null);
    setMenuOpen(false);
    router.push("/login");
  };

  // Surface every routable page so teammates can reach each screen quickly
  const navItems = [
    { href: "/home", label: "Home" },
    { href: "/project", label: "My Projects" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ];

  const authButtons = [
    { href: "/login", label: "Sign In", style: "secondary" },
    { href: "/signup", label: "Sign Up", style: "primary" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.navFlex}>
        <div className={styles.navLinks}>
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </div>
        <div className={styles.navLinks}>
          {activeAccount ? (
            <div className={styles.accountContainer} ref={containerRef}>
              <button
                type="button"
                onClick={handleToggleMenu}
                className={styles.accountButton}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <span className={styles.accountLabel}>Account</span>
                <span className={styles.accountName}>{activeAccount}</span>
              </button>
              {menuOpen && (
                <div className={styles.accountDropdown}>
                  <p className={styles.accountDropdownText}>
                    Signed in as <strong>{activeAccount}</strong>
                  </p>
                  <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            authButtons.map(({ href, label, style }) => (
              <Link
                key={href}
                href={href}
                className={style === "primary" ? styles.primaryButton : styles.secondaryButton}
              >
                {label}
              </Link>
            ))
          )}
        </div>
      </div>
    </nav>
  );
}
