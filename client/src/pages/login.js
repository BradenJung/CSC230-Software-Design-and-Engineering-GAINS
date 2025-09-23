import Link from "next/link";
import Style from "../styles/Home.module.css"

// Login page
export default function login() {
  return (
    <main>
      <h1>Login Page</h1>
      <div className={Style.navFlex}>
        <Link href="/signup" className={Style.navButton}>Signup</Link>
        <Link href="/linear-regression" className={Style.navButton}>Linear Regression</Link>
      </div>
    </main>
  );
}