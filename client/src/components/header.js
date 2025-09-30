import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Header() {
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
          {authButtons.map(({ href, label, style }) => (
            <Link 
              key={href} 
              href={href} 
              className={style === "primary" ? styles.primaryButton : styles.secondaryButton}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
