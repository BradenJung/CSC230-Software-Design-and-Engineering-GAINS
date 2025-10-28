import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/CodexTool.module.css";

export default function CodexTool({ variant = "floating" }) {
  const isFullscreen = variant === "fullscreen";
  const [isExpanded, setIsExpanded] = useState(isFullscreen);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const historyRef = useRef(null);

  const handleToggle = () => {
    if (isFullscreen) {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmitPrompt = async () => {
    if (!prompt.trim()) {
      return;
    }

    const userMessage = { role: "user", content: prompt.trim() };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setPrompt("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      const replyContent = data.reply?.trim() || "Sorry, I didn't understand that.";

      setMessages((prev) => [...prev, { role: "assistant", content: replyContent }]);
    } catch (err) {
      setError("We hit a snag talking to Codex. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const panel = (
    <div className={`${styles.panel} ${isFullscreen ? styles.panelFullscreen : ""}`}>
      <div className={`${styles.panelBody} ${isFullscreen ? styles.panelBodyFullscreen : ""}`}>
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

        {(messages.length > 0 || isFullscreen) && (
          <div
            className={`${styles.history} ${isFullscreen ? styles.historyFullscreen : ""}`}
            ref={historyRef}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "user" ? styles.messageUser : styles.messageAssistant}
              >
                {message.content}
              </div>
            ))}
            {messages.length === 0 && !isLoading && isFullscreen && (
              <div className={styles.historyPlaceholder}>
                Ask a question to start your Codex session.
              </div>
            )}
            {isLoading && <div className={styles.messageAssistant}>Thinking…</div>}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

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
            disabled={isLoading}
          />
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSubmitPrompt}
            aria-label="Submit Codex prompt"
            disabled={isLoading}
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
  );

  if (isFullscreen) {
    return (
      <section className={styles.fullscreenShell} role="complementary">
        {panel}
      </section>
    );
  }

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
          {isExpanded && !isFullscreen && (
            <button
              type="button"
              className={styles.expandSymbolButton}
              aria-label="Expand Codex window"
              onClick={(event) => event.stopPropagation()}
            >
              ⤢
            </button>
          )}
        </span>
      </button>

      {isExpanded && panel}
    </aside>
  );
}
