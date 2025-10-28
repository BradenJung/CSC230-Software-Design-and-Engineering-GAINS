import Head from "next/head";
import Header from "../components/header";
import styles from "../styles/Home.module.css";
import CodexTool from "../components/CodexTool";

export default function Chat() {
  return (
    <div className={`${styles.home} ${styles.chatHome}`}>
      <Head>
        <title>Chat · GAINS Toolkit</title>
      </Head>

      <Header />
      <main className={styles.chatMain}>
        <CodexTool variant="fullscreen" />
      </main>
    </div>
  );
}
