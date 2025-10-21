import Link from "next/link";
import { useState } from "react";
import styles from "../styles/CodexTool.module.css";

export default function CodexTool() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleToggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setPrompt("");
      }
      return next;
    });
  };

  return (
    <aside className={`${styles.codexTool} ${isExpanded ? styles.expanded : ""}`} role="complementary">
      <button
        type="button"
        className={styles.trigger}
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <span className={styles.triggerLabel}>Codex Help</span>
        <span className={styles.triggerIcons}>
          <span className={`${styles.caret} ${isExpanded ? styles.caretOpen : ""}`} aria-hidden />
          {isExpanded && (
            <span className={styles.closeIcon} aria-hidden>
              &times;
            </span>
          )}
        </span>
      </button>

      {isExpanded && (
        <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div className={styles.greeting}>
                <div className={styles.greetingCopy}>
                  <p className={styles.greetingHeadline}>Hello, how can I help today?</p>
                
                </div>
              </div>

            <div className={styles.optionList}>
              <Link href="/project" className={styles.optionButton}>
                Get started with a project!
              </Link>
            </div>

            <p className={styles.notice}>
              By using, you agree to our Terms and Conditions.
            </p>

            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="Ask our chatbot"
                aria-label="Ask our chatbot"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <span className={styles.sendIcon} aria-hidden>
                <svg viewBox="0 0 24 24" focusable="false" className={styles.sendSvg}>
                  <path d="M3.4 20.6 21 12 3.4 3.4 3 10l10 2-10 2z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
