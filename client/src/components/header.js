import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Header() {
  // Surface every routable page so teammates can reach each screen quickly
  const navItems = [
    { href: "/", label: "Index" },
    { href: "/home", label: "Home" },
    { href: "/login", label: "Login" },
    { href: "/signup", label: "Signup" },
    { href: "/linear-regression", label: "Linear Regression" },
    { href: "/bar-chart", label: "Bar Chart" },
    { href: "/line-chart", label: "Line Chart" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        {navItems.map(({ href, label }) => (
          <Link key={href} href={href} className={styles.navLink}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
