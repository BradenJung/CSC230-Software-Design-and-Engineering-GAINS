import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import CodexTool from "../components/CodexTool";

export default function Codex() {
  return (
    <div className={styles.home}>
      <Head>
        <title>Bar Chart · GAINS Toolkit</title>
      </Head>

      <Header />
      <CodexTool />

      <main className={styles.pageMain}>
        <section className={styles.pageCard}>
          <h1>Codex Testing Page</h1>
          <p>
            This page is going to be used to test the CodexTool component.
          </p>
        </section>
      </main>
    </div>
  );
}