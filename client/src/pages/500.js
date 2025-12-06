import Head from "next/head";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import AccessibilityButton from "../components/AccessibilityButton";
import CodexTool from "../components/CodexTool";

export default function Custom500() {
  return (
    <>
      <Head>
        <title>500 - Server Error · GAINS Toolkit</title>
        <meta name="description" content="An internal server error occurred" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.home}>
        <Header />
        <main className={styles.homeMain}>
          <section style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '48px 24px'
          }}>
            <h1 style={{ 
              fontSize: '120px', 
              fontWeight: '700', 
              margin: '0 0 24px 0',
              color: 'var(--foreground)',
              lineHeight: '1'
            }}>
              500
            </h1>
            <h2 className={styles.heroTitle}>
              Server error
            </h2>
            <p className={styles.heroSubtitle} style={{ marginTop: '16px', marginBottom: '32px' }}>
              Something went wrong on our end. Please try again later.
            </p>
            <Link href="/home" className={styles.primaryButton}>
              Go to Home
            </Link>
          </section>
        </main>
        {/*Adds Accessibility Button to page */}
        <AccessibilityButton />
        {/*Adds Chat Option to the current page */}
        <CodexTool />
      </div>
    </>
  );
}

