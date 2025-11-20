import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../styles/Home.module.css";
import HealthStatus from "./healthStatus";
import { apiUrl } from "../lib/api";

export default function Header() {
  // Surface every routable page so teammates can reach each screen quickly
  const navItems = [
    { href: "/home", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ];

  const authButtons = [
    { href: "/login", label: "Sign In", style: "secondary" },
    { href: "/signup", label: "Sign Up", style: "primary" },
  ];

  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const res = await fetch(apiUrl("/api/me"), { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.user) setUser(data.user);
      } catch {
        /* ignore */
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  const handleSignOut = () => {
    fetch(apiUrl("/api/logout"), {
      method: "POST",
      credentials: "include",
    }).finally(() => setUser(null));
  };

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
          {user ? (
            <>
              <span className={styles.userBadge}>
                Hi, {user.name || user.email}
              </span>
              <button className={styles.secondaryButton} onClick={handleSignOut}>
                Sign out
              </button>
              <HealthStatus />
            </>
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
