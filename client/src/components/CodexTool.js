import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/CodexTool.module.css";

const STORAGE_KEY = "gains-projects";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const ACTIVE_PROJECTS_KEY = "gains.activeProjects";
const IMPORTED_CSV_DATA_KEY = "importedCsvData";
const PROJECT_CONTEXT_ROW_LIMIT = 25;
const DEFAULT_ACCOUNT_KEY = "__guest__";

const normalizeAccountKey = (accountName) => {
  if (!accountName || typeof accountName !== "string") {
    return DEFAULT_ACCOUNT_KEY;
  }
  const normalized = accountName.trim().toLowerCase();
  return normalized || DEFAULT_ACCOUNT_KEY;
};

const parseStoredProjects = (raw) => {
  const base = { accounts: {} };
  if (!raw) {
    return base;
  }

  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data?.projects)) {
      base.accounts[DEFAULT_ACCOUNT_KEY] = {
        projects: data.projects,
        nextIndex:
          typeof data.nextIndex === "number"
            ? data.nextIndex
            : data.projects.length + 1
      };
      return base;
    }

    if (data && typeof data === "object" && data.accounts && typeof data.accounts === "object") {
      const normalizedAccounts = {};
      Object.entries(data.accounts).forEach(([key, value]) => {
        if (Array.isArray(value?.projects)) {
          normalizedAccounts[normalizeAccountKey(key)] = {
            projects: value.projects,
            nextIndex:
              typeof value.nextIndex === "number"
                ? value.nextIndex
                : value.projects.length + 1
          };
        }
      });
      return { accounts: normalizedAccounts };
    }
  } catch (error) {
    console.error("Failed to parse project storage snapshot", error);
  }

  return base;
};

const parseActiveProjects = (raw) => {
  if (!raw) {
    return {};
  }
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      return data;
    }
  } catch (error) {
    console.error("Failed to parse active project selection snapshot", error);
  }
  return {};
};

const parseProjectId = (value) => {
  if (Array.isArray(value)) {
    return parseProjectId(value[0]);
  }
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
};

const resolveColumnNames = (rows) => {
  const columnSet = new Set();
  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    Object.keys(row).forEach((key) => {
      if (typeof key === "string" && key.trim()) {
        columnSet.add(key);
      }
    });
  });
  return Array.from(columnSet);
};

export default function CodexTool({ variant = "floating" }) {
  const isFullscreen = variant === "fullscreen";
  const [isExpanded, setIsExpanded] = useState(isFullscreen);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectContext, setProjectContext] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const historyRef = useRef(null);
  const selectionInitializedRef = useRef(false);

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

  const activeProjectSummary = useMemo(() => {
    if (selectedProjectId === null) {
      return null;
    }
    return availableProjects.find((project) => project.id === selectedProjectId) || null;
  }, [availableProjects, selectedProjectId]);

  const selectId = isFullscreen ? "codex-project-picker-fullscreen" : "codex-project-picker";
  const showProjectPicker = availableProjects.length > 0;
  const showProjectCta =
    availableProjects.length === 0 ||
    availableProjects.every((project) => !project.totalRows);

  useEffect(() => {
    setProjectContext(activeProjectSummary);
  }, [activeProjectSummary]);

  const hydrateProjectContext = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storage = window.localStorage;
      const snapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
      const normalizedAccount = normalizeAccountKey(storage.getItem(ACTIVE_ACCOUNT_KEY));
      const accountState = snapshot.accounts[normalizedAccount];

      if (!accountState || !Array.isArray(accountState.projects) || accountState.projects.length === 0) {
        setAvailableProjects([]);
        setSelectedProjectId(null);
        selectionInitializedRef.current = false;
        return;
      }

      const activeProjectsSnapshot = parseActiveProjects(storage.getItem(ACTIVE_PROJECTS_KEY));
      const activeProjectId = parseProjectId(activeProjectsSnapshot[normalizedAccount]);

      const safeProjects = accountState.projects
        .map((project) => {
          const projectId = parseProjectId(project?.id);
          if (projectId === null) {
            return null;
          }

          const projectName =
            typeof project.name === "string" && project.name.trim()
              ? project.name.trim()
              : `Project ${projectId}`;

          const importedRows = Array.isArray(project[IMPORTED_CSV_DATA_KEY])
            ? project[IMPORTED_CSV_DATA_KEY]
            : Array.isArray(project.importedRows)
              ? project.importedRows
              : [];

          const limitedRows = importedRows.slice(0, PROJECT_CONTEXT_ROW_LIMIT);
          const columnNames = resolveColumnNames(limitedRows);

          return {
            id: projectId,
            name: projectName,
            projectName,
            importedRows: limitedRows,
            totalRows: importedRows.length,
            columnNames,
            previewRowCount: limitedRows.length
          };
        })
        .filter(Boolean);

      setAvailableProjects(safeProjects);

      if (safeProjects.length === 0) {
        setSelectedProjectId(null);
        selectionInitializedRef.current = false;
        return;
      }

      setSelectedProjectId((prevSelected) => {
        const prevIsValid =
          prevSelected !== null &&
          safeProjects.some((project) => project.id === prevSelected);

        if (prevIsValid) {
          return prevSelected;
        }

        const activeIsValid =
          activeProjectId !== null &&
          safeProjects.some((project) => project.id === activeProjectId);

        if (!selectionInitializedRef.current) {
          selectionInitializedRef.current = true;
          if (activeIsValid) {
            return activeProjectId;
          }
          return safeProjects[0].id;
        }

        if (prevSelected === null) {
          return null;
        }

        if (activeIsValid) {
          return activeProjectId;
        }

        return safeProjects[0].id;
      });
    } catch (err) {
      console.error("Failed to hydrate project context for GAINS Analysis", err);
      setAvailableProjects([]);
      setSelectedProjectId(null);
      selectionInitializedRef.current = false;
    }
  }, [selectionInitializedRef]);

  useEffect(() => {
    hydrateProjectContext();
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event) => {
      if (
        !event ||
        !event.key ||
        event.key === STORAGE_KEY ||
        event.key === ACTIVE_ACCOUNT_KEY ||
        event.key === ACTIVE_PROJECTS_KEY
      ) {
        hydrateProjectContext();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", hydrateProjectContext);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", hydrateProjectContext);
    };
  }, [hydrateProjectContext]);

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
        body: JSON.stringify({
          messages: nextMessages,
          ...(projectContext ? { projectContext } : {})
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      const replyContent = data.reply?.trim() || "Sorry, I didn't understand that.";

      setMessages((prev) => [...prev, { role: "assistant", content: replyContent }]);
    } catch (err) {
      setError("We hit a snag talking to GAINS Analysis. Please try again.");
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

        {showProjectCta && (
          <div className={styles.optionList}>
            <Link href="/project" className={styles.optionButton}>
              Get started with a project!
            </Link>
          </div>
        )}

        {showProjectPicker && (
          <div className={styles.projectPicker}>
            <label className={styles.projectPickerLabel} htmlFor={selectId}>
              Project context
            </label>
            <div className={styles.projectPickerSelectWrapper}>
              <select
                id={selectId}
                className={styles.projectPickerSelect}
                value={selectedProjectId ?? ""}
                onChange={(event) => {
                  const { value } = event.target;
                  if (value === "") {
                    setSelectedProjectId(null);
                    return;
                  }
                  const parsedId = parseProjectId(value);
                  setSelectedProjectId(parsedId === null ? null : parsedId);
                }}
              >
                <option value="">No project context</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <span className={styles.projectPickerChevron} aria-hidden />
            </div>
            {activeProjectSummary && (
              <p className={styles.projectPickerMeta}>
                {activeProjectSummary.totalRows > 0
                  ? `Previewing ${activeProjectSummary.previewRowCount} of ${activeProjectSummary.totalRows} row(s).`
                  : "No imported data shared with GAINS Analysis yet."}
                {activeProjectSummary.columnNames.length > 0
                  ? ` Columns: ${activeProjectSummary.columnNames.join(", ")}.`
                  : ""}
              </p>
            )}
          </div>
        )}

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
                Ask a question to start your GAINS Analysis session.
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
            aria-label="Submit GAINS Analysis prompt"
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
            <Link
              href="/chat"
              className={styles.expandSymbolButton}
              aria-label="Open GAINS Analysis fullscreen"
              onClick={(event) => event.stopPropagation()}
            >
              ⤢
            </Link>
          )}
        </span>
      </button>

      {isExpanded && panel}
    </aside>
  );
}
