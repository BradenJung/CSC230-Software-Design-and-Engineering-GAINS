import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import layoutStyles from "../styles/Home.module.css";
import projectStyles from "../styles/Project.module.css";

// Persist projects in localStorage so we remember state between sessions
const STORAGE_KEY = "gains-projects";
const INITIAL_PROJECTS = [
  { id: 1, name: "Sample Project 1" },
  { id: 2, name: "Sample Project 2" },
  { id: 3, name: "Sample Project 3" },
  { id: 4, name: "Sample Project 4" }
];

export default function Project() {
  // Track the list of projects and the next id we should assign
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [nextIndex, setNextIndex] = useState(() => INITIAL_PROJECTS.length + 1);
  // Delete-related UI state
  const [deleteMode, setDeleteMode] = useState(false);
  // Set once localStorage has been read on the client
  const [hydrated, setHydrated] = useState(false);
  // The project currently being edited in the modal
  const [settingsProject, setSettingsProject] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // On first client render, hydrate from localStorage if possible
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.projects) && typeof parsed?.nextIndex === "number") {
          setProjects(parsed.projects);
          setNextIndex(parsed.nextIndex);
        }
      }
    } catch (err) {
      console.error("Failed to read stored projects", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) {
      return;
    }
    // Persist projects whenever they change
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projects, nextIndex })
      );
    } catch (err) {
      console.error("Failed to persist projects", err);
    }
  }, [projects, nextIndex, hydrated]);

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

  function handleCreateProject() {
    // Create a new project with an incrementing label and id
    setProjects((prev) => {
      const label = `Sample Project ${nextIndex}`;
      const project = { id: nextIndex, name: label };
      return [...prev, project];
    });
    setNextIndex((prev) => prev + 1);
  }

  function handleToggleDeleteMode() {
    if (projects.length === 0 && !deleteMode) {
      return;
    }
    // Flip delete mode so cards become clickable for removal
    setDeleteMode((prev) => !prev);
  }

  function handleProjectClick(id) {
    if (!deleteMode) {
      return;
    }
    // Remove the selected project and exit delete mode afterward
    setProjects((prev) => prev.filter((project) => project.id !== id));
    setDeleteMode(false);
  }

  function handleDeleteAll() {
    if (!deleteMode || projects.length === 0) {
      return;
    }
    setProjects([]);
    setDeleteMode(false);
  }

  function handleCardKeyDown(event, id) {
    if (!deleteMode) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleProjectClick(id);
    }
  }

  function handleSettingsClick(event, project) {
    event.stopPropagation();
    if (deleteMode) {
      return;
    }
    // Open the settings modal for the selected project
    setSettingsProject(project);
  }

  function handleCloseSettings() {
    // Close the modal and clear the selected project
    setSettingsProject(null);
  }

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
                  className={cardClassName}
                  role={deleteMode ? "button" : "group"}
                  tabIndex={deleteMode ? 0 : -1}
                  onClick={() => handleProjectClick(project.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, project.id)}
                >
                  <span className={projectStyles.cardSpacer} aria-hidden="true" />
                  <div className={projectStyles.projectName}>{project.name}</div>
                  <button
                    type="button"
                    className={projectStyles.settingsButton}
                    onClick={(event) => handleSettingsClick(event, project)}
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
              ))}
            </div>
          )}
        </section>
        {settingsProject && (
          <div
            className={projectStyles.settingsOverlay}
            role="presentation"
            onClick={handleCloseSettings}
          >
            <div
              className={projectStyles.settingsModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-settings-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="project-settings-title" className={projectStyles.settingsModalTitle}>
                Settings
              </h2>
              <p className={projectStyles.settingsModalCopy}>
                Settings for {settingsProject.name}
              </p>
              {/* Basic placeholder content until the modal is expanded */}
              <button
                type="button"
                className={projectStyles.closeSettingsButton}
                onClick={handleCloseSettings}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
