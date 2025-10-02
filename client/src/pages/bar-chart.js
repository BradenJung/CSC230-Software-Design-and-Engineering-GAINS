import Head from "next/head";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

export default function BarChart() {
  return (
    <div className={styles.home}>
      <Head>
        <title>Bar Chart · GAINS Toolkit</title>
      </Head>

      <Header />

      <main className={styles.pageMain}>
        <section className={styles.pageCard}>
          <h1>Bar Chart Module</h1>
          <p>
            Craft quick comparisons with configurable color palettes, hover states, and exportable
            visuals. The interactive builder will live here once the data pipeline is wired in.
          </p>
          <ul>
            <li>Upload a CSV or select a sample dataset to pre-populate categories.</li>
            <li>Adjust grouping, sorting, and annotations before sharing results.</li>
            <li>
              Need to explore now? Head to the <Link href="/linear-regression">linear regression demo</Link>
              for a live preview of the toolkit experience.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
