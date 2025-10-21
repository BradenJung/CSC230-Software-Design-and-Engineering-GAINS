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

  const handleSubmitPrompt = () => {
    if (!prompt.trim()) {
      return;
    }

    console.info("Codex prompt submitted:", prompt.trim());
    setPrompt("");
  };

  return (
    <aside
      className={`${styles.codexTool} ${isExpanded ? styles.expanded : styles.collapsed}`}
      role="complementary"
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <span className={styles.triggerLabel}>Need Help?</span>
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
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmitPrompt();
                  }
                }}
              />
              <button
                type="button"
                className={styles.sendButton}
                onClick={handleSubmitPrompt}
                aria-label="Submit Codex prompt"
              >
                <span className={styles.sendIcon} aria-hidden>
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <polyline
                      points="8 4 16 12 8 20"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
