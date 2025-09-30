import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import layoutStyles from "../styles/Home.module.css";
import projectStyles from "../styles/Project.module.css";

const STORAGE_KEY = "gains-projects";
const INITIAL_PROJECTS = [
  { id: 1, name: "Sample Project 1" },
  { id: 2, name: "Sample Project 2" },
  { id: 3, name: "Sample Project 3" },
  { id: 4, name: "Sample Project 4" }
];

export default function Project() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [nextIndex, setNextIndex] = useState(() => INITIAL_PROJECTS.length + 1);
  const [deleteMode, setDeleteMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
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
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projects, nextIndex })
      );
    } catch (err) {
      console.error("Failed to persist projects", err);
    }
  }, [projects, nextIndex, hydrated]);

  const deleteButtonClassName = useMemo(() => {
    const base = `${layoutStyles.primaryButton} ${projectStyles.actionButton} ${projectStyles.deleteButton}`;
    return deleteMode ? `${base} ${projectStyles.deleteButtonActive}` : base;
  }, [deleteMode]);

  const cardClassName = useMemo(() => {
    return deleteMode
      ? `${projectStyles.projectCard} ${projectStyles.projectCardDeleteMode}`
      : projectStyles.projectCard;
  }, [deleteMode]);

  function handleCreateProject() {
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
    setDeleteMode((prev) => !prev);
  }

  function handleProjectClick(id) {
    if (!deleteMode) {
      return;
    }
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
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleProjectClick(project.id)}
                  className={cardClassName}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
