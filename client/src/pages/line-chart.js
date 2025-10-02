import Head from "next/head";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

export default function LineChart() {
  return (
    <div className={styles.home}>
      <Head>
        <title>Line Chart · GAINS Toolkit</title>
      </Head>

      <Header />

      <main className={styles.pageMain}>
        <section className={styles.pageCard}>
          <h1>Line Chart Module</h1>
          <p>
            Track changes over time with multi-series line visuals, confidence bands, and animated
            transitions. This page will host the interactive prototype once the data hooks are ready.
          </p>
          <ul>
            <li>Choose a time field, stack multiple series, and layer moving averages.</li>
            <li>Preview tooltips, annotations, and export-ready states before publishing.</li>
            <li>
              Curious about the workflow? Visit the <Link href="/home">homepage</Link> to see how these
              modules tie into the broader GAINS experience.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
