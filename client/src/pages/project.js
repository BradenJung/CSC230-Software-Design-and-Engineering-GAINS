import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/header";
import Footer from "../components/footer";
import layoutStyles from "../styles/Home.module.css";
import projectStyles from "../styles/Project.module.css";

// Persist projects in localStorage so we remember state between sessions
const STORAGE_KEY = "gains-projects";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const ACTIVE_PROJECTS_KEY = "gains.activeProjects";
const AUTH_CHANGE_EVENT = "gains-auth-change";
const DEFAULT_ACCOUNT_KEY = "__guest__";
const IMPORTED_CSV_DATA_KEY = "importedCsvData";
const INITIAL_PROJECTS = [
  { id: 1, name: "Sample Project 1" },
  { id: 2, name: "Sample Project 2" },
  { id: 3, name: "Sample Project 3" },
  { id: 4, name: "Sample Project 4" }
];

// Keep a guaranteed CSV payload shell on every project record for the linear regression page.
const withImportedCsvData = (project) => {
  if (!project || typeof project !== "object") {
    return project;
  }
  const importedCsvData = Array.isArray(project[IMPORTED_CSV_DATA_KEY])
    ? project[IMPORTED_CSV_DATA_KEY]
    : [];
  const importedRows = Array.isArray(project.importedRows)
    ? project.importedRows
    : importedCsvData;
  const selectedTool =
    typeof project.selectedTool === "string" && project.selectedTool.trim()
      ? project.selectedTool
      : "linear-regression";
  return {
    ...project,
    [IMPORTED_CSV_DATA_KEY]: importedCsvData,
    importedRows,
    selectedTool
  };
};

// Build the default state object used before localStorage synchronizes
const createDefaultProjectsState = () => ({
  projects: INITIAL_PROJECTS.map((project) => withImportedCsvData({ ...project })),
  nextIndex: INITIAL_PROJECTS.length + 1
});

// Translate any provided account identifier into the normalized storage key
const normalizeAccountKey = (accountName) => {
  if (!accountName || typeof accountName !== "string") {
    return DEFAULT_ACCOUNT_KEY;
  }
  const normalized = accountName.trim().toLowerCase();
  return normalized || DEFAULT_ACCOUNT_KEY;
};

// Read the serialized storage payload and coerce it into the expected structure
const parseStoredProjects = (raw) => {
  const base = { accounts: {} };
  if (!raw) {
    return base;
  }

  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      if (Array.isArray(data.projects)) {
        base.accounts[DEFAULT_ACCOUNT_KEY] = {
          projects: data.projects,
          nextIndex:
            typeof data.nextIndex === "number"
              ? data.nextIndex
              : data.projects.length + 1
        };
        return base;
      }

      if (data.accounts && typeof data.accounts === "object") {
        const normalizedAccounts = {};
        Object.entries(data.accounts).forEach(([key, value]) => {
          if (Array.isArray(value?.projects) && typeof value?.nextIndex === "number") {
            normalizedAccounts[normalizeAccountKey(key)] = {
              projects: value.projects,
              nextIndex: value.nextIndex
            };
          }
        });
        return { accounts: normalizedAccounts };
      }
    }
  } catch (error) {
    console.error("Failed to parse project storage", error);
  }

  return base;
};

export default function Project() {
  // Track the list of projects and the next id we should assign
  const defaultState = createDefaultProjectsState();
  const [projects, setProjects] = useState(defaultState.projects);
  const [nextIndex, setNextIndex] = useState(defaultState.nextIndex);
  const router = useRouter();
  // Delete-related UI state
  const [deleteMode, setDeleteMode] = useState(false);
  // Set once localStorage has been read on the client
  const [hydrated, setHydrated] = useState(false);
  const [activeAccount, setActiveAccount] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  // Keep the active account in sync with localStorage and custom auth events
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncAccount = () => {
      const accountName = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      setActiveAccount(accountName);
    };

    syncAccount();

    const handleStorage = (event) => {
      if (event.key === ACTIVE_ACCOUNT_KEY) {
        setActiveAccount(event.newValue);
      }
    };

    const handleAuthChange = (event) => {
      if (event.detail && Object.prototype.hasOwnProperty.call(event.detail, "accountName")) {
        setActiveAccount(event.detail.accountName);
      } else {
        syncAccount();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  // Load the project list for the active account once the client has storage access
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setHydrated(false);
    const snapshot = parseStoredProjects(window.localStorage.getItem(STORAGE_KEY));
    const accountKey = normalizeAccountKey(activeAccount);
    const accountState = snapshot.accounts[accountKey];

    if (accountState) {
      setProjects(accountState.projects.map((project) => withImportedCsvData(project)));
      setNextIndex(accountState.nextIndex);
    } else {
      const defaults = createDefaultProjectsState();
      setProjects(defaults.projects);
      setNextIndex(defaults.nextIndex);
    }

    setDeleteMode(false);
    setHydrated(true);
  }, [activeAccount]);

  // Persist the current account's projects whenever the list or active account changes
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) {
      return;
    }
    // Persist projects whenever they change for the active account
    try {
      const snapshot = parseStoredProjects(window.localStorage.getItem(STORAGE_KEY));
      const accountKey = normalizeAccountKey(activeAccount);
      snapshot.accounts[accountKey] = {
        projects: projects.map((project) => withImportedCsvData(project)),
        nextIndex
      };
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(snapshot)
      );
    } catch (err) {
      console.error("Failed to persist projects", err);
    }
  }, [projects, nextIndex, activeAccount, hydrated]);

  // Recompute the delete button styling when delete mode toggles
  const deleteButtonClassName = useMemo(() => {
    const base = `${layoutStyles.primaryButton} ${projectStyles.actionButton} ${projectStyles.deleteButton}`;
    return deleteMode ? `${base} ${projectStyles.deleteButtonActive}` : base;
  }, [deleteMode]);

  // Give project cards a distinct style while delete mode is active
  const cardClassName = useMemo(() => {
    return deleteMode
      ? `${projectStyles.projectCard} ${projectStyles.projectCardDeleteMode}`
      : projectStyles.projectCard;
  }, [deleteMode]);

  // Add a new project shell with an auto-incrementing label
  function handleCreateProject() {
    // Create a new project with an incrementing label and id
    setProjects((prev) => {
      const label = `Sample Project ${nextIndex}`;
      const project = withImportedCsvData({ id: nextIndex, name: label });
      return [...prev, project];
    });
    setNextIndex((prev) => prev + 1);
  }

  // Toggle deletion mode to enable the tap-to-remove UX
  function handleToggleDeleteMode() {
    if (projects.length === 0 && !deleteMode) {
      return;
    }
    // Flip delete mode so cards become clickable for removal
    setDeleteMode((prev) => !prev);
  }

  // Remove a project when the user clicks it while in delete mode
  function persistActiveProjectSelection(projectId) {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const accountKey = normalizeAccountKey(activeAccount);
      const raw = window.localStorage.getItem(ACTIVE_PROJECTS_KEY);
      const snapshot = raw ? JSON.parse(raw) : {};
      snapshot[accountKey] = projectId;
      window.localStorage.setItem(ACTIVE_PROJECTS_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.error("Failed to persist active project selection", err);
    }
  }

  function navigateToProject(project) {
    persistActiveProjectSelection(project.id);
    router
      .push({
        pathname: "/linear-regression",
        query: { projectId: project.id }
      })
      .catch((err) => console.error("Failed to navigate to project page", err));
  }

  function handleProjectCardClick(project) {
    if (deleteMode) {
      // Remove the selected project and exit delete mode afterward
      setProjects((prev) => prev.filter((candidate) => candidate.id !== project.id));
      setDeleteMode(false);
      return;
    }
    navigateToProject(project);
  }

  function handleDeleteAll() {
    if (!deleteMode || projects.length === 0) {
      return;
    }
    setProjects([]);
    setDeleteMode(false);
  }

  function handleCardKeyDown(event, project) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleProjectCardClick(project);
    }
  }

  function handleSettingsClick(event, projectId) {
    event.stopPropagation();
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
  }

  useEffect(() => {
    if (deleteMode) {
      setExpandedProjectId(null);
    }
  }, [deleteMode]);

  return (
    <div className={layoutStyles.home}>
      <Header />
      <main className={layoutStyles.homeMain}>
        <section className={projectStyles.projectIntro}>
          <h1 className={projectStyles.pageTitle}>Projects</h1>
          <div className={projectStyles.actionsRow}>
            <button
              type="button"
              className={`${layoutStyles.primaryButton} ${projectStyles.actionButton}`}
              onClick={handleCreateProject}
            >
              New project +
            </button>
            <button
              type="button"
              className={deleteButtonClassName}
              onClick={handleToggleDeleteMode}
              disabled={projects.length === 0 && !deleteMode}
            >
              {deleteMode ? "Cancel delete" : "Delete project -"}
            </button>
            {deleteMode && projects.length > 0 && (
              <button
                type="button"
                className={`${layoutStyles.secondaryButton} ${projectStyles.actionButton} ${projectStyles.selectAllButton}`}
                onClick={handleDeleteAll}
              >
                Select all
              </button>
            )}
          </div>
          {deleteMode && (
            <p className={projectStyles.deleteHelper}>
              Delete mode: select a project card to remove it, or use Select all to delete everything.
            </p>
          )}
        </section>

        <section className={projectStyles.projectsSection}>
          {projects.length === 0 ? (
            <p className={projectStyles.emptyState}>
              You haven&apos;t created any projects yet. Click “New project +” to get started.
            </p>
          ) : (
            <div className={projectStyles.projectsGrid}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={
                    expandedProjectId === project.id
                      ? `${cardClassName} ${projectStyles.projectCardExpanded}`
                      : cardClassName
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => handleProjectCardClick(project)}
                  onKeyDown={(event) => handleCardKeyDown(event, project)}
                >
                  <div className={projectStyles.cardHeader}>
                    <span className={projectStyles.cardSpacer} aria-hidden="true" />
                    <div className={projectStyles.projectName}>{project.name}</div>
                    <button
                      type="button"
                      className={projectStyles.settingsButton}
                      onClick={(event) => handleSettingsClick(event, project.id)}
                      aria-label={`Settings for ${project.name}`}
                    >
                      <img
                        src="/settings.svg"
                        alt=""
                        aria-hidden="true"
                        className={projectStyles.settingsIcon}
                        draggable={false}
                      />
                    </button>
                  </div>
                  {expandedProjectId === project.id && (
                    <>
                      <p className={projectStyles.projectSettingsLabel}>Settings</p>
                      <div className={projectStyles.projectActions}>
                        <button
                          type="button"
                          className={`${layoutStyles.primaryButton} ${projectStyles.projectActionButton}`}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={`${layoutStyles.secondaryButton} ${projectStyles.projectActionButton}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
