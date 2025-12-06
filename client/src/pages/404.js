import Head from "next/head";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import AccessibilityButton from "../components/AccessibilityButton";
import CodexTool from "../components/CodexTool";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found · GAINS Toolkit</title>
        <meta name="description" content="The page you're looking for doesn't exist" />
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
              404
            </h1>
            <h2 className={styles.heroTitle}>
              Page not found
            </h2>
            <p className={styles.heroSubtitle} style={{ marginTop: '16px', marginBottom: '32px' }}>
              The page you're looking for doesn't exist or has been moved.
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
