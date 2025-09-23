import Link from "next/link";
import Style from "../styles/Home.module.css"

// Signup Page
export default function Signup() {
  return (
    <main>
      <h1>Signup Page</h1>
      <div className={Style.navFlex}>
        <Link href="/login" className={Style.navButton}>Login</Link>
      </div>
    </main>
  );
}