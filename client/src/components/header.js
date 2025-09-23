import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Header() {
  return (<>
    {/* Top Navigation */}
    <nav className={styles.navbar}>
      <div className={styles.navFlex}>
        {/* Maybe add a logo so something */}
        <Link href="/" className={styles.navLink}>Home</Link> 
        <Link href="/signup" className={styles.navButton}>Sign Up</Link>
      </div>
    </nav>
  </>);
}