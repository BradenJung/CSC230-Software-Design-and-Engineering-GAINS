import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const AUTH_CHANGE_EVENT = "gains-auth-change";

export default function Header({
  onImportClick,
  onEditClick,
  onExportClick,
  onCopyClick = () => {},
  onProjectRename = () => {},
  isRightPanelVisible,
  currentProjectName
}) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mirror the current account stored in localStorage and custom auth events
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncActiveAccount = () => {
      const storage = window.localStorage;
      setActiveAccount(storage.getItem(ACTIVE_ACCOUNT_KEY));
    };

    syncActiveAccount();

    const handleStorage = (event) => {
      if (event.key === ACTIVE_ACCOUNT_KEY) {
        setActiveAccount(event.newValue);
      }
    };

    const handleAuthChange = (event) => {
      if (event.detail && Object.prototype.hasOwnProperty.call(event.detail, "accountName")) {
        setActiveAccount(event.detail.accountName);
        return;
      }

      syncActiveAccount();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  // Collapse the account menu when the user signs out
  useEffect(() => {
    if (!activeAccount) {
      setMenuOpen(false);
    }
  }, [activeAccount]);

  // Listen for outside clicks so the account menu closes when focus leaves
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const handleClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [menuOpen]);

  // Toggle the visibility of the account dropdown
  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  // Clear auth state, notify listeners, and route the user back to login
  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { accountName: null } }));
    }

    setActiveAccount(null);
    setMenuOpen(false);
    router.push("/login");
  };

  // Check if we're on the linear regression page
  const isLinearRegressionPage = router.pathname === '/linear-regression';

  const [renamingProject, setRenamingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(currentProjectName || "");
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (!renamingProject) {
      setProjectNameDraft(currentProjectName || "");
    }
  }, [currentProjectName, renamingProject]);

  useEffect(() => {
    if (renamingProject && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingProject]);

  const beginRename = () => {
    setProjectNameDraft(currentProjectName || "");
    setRenamingProject(true);
  };

  const cancelRename = () => {
    setRenamingProject(false);
    setProjectNameDraft(currentProjectName || "");
  };

  const submitRename = async () => {
    const trimmed = (projectNameDraft || "").trim();
    if (!trimmed || trimmed === currentProjectName) {
      cancelRename();
      return;
    }
    try {
      const result = await onProjectRename(trimmed);
      if (result === false) {
        return;
      }
      setProjectNameDraft(trimmed);
      setRenamingProject(false);
    } catch (error) {
      console.error("Failed to rename project", error);
    }
  };

  const handleRenameKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  };

  // Surface every routable page so teammates can reach each screen quickly
  const navItems = [
    { href: "/home", label: "Home" },
    { href: "/project", label: "My Projects" },
    { href: "/learn", label: "Learn" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ];

  // Tool-specific navigation items for linear regression page
  const toolNavItems = [
    { label: "Edit", onClick: onEditClick },
    { label: "Import", onClick: onImportClick },
    { label: "Export", onClick: onExportClick },
    { label: "Copy R Code", onClick: onCopyClick, icon: "{}" },
  ];

  const authButtons = [
    { href: "/login", label: "Sign In", style: "secondary" },
    { href: "/signup", label: "Sign Up", style: "primary" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={isLinearRegressionPage ? styles.navFlexThreeColumn : styles.navFlex}>
        {/* Leading side - Home and My Projects for linear regression page, or full nav for other pages */}
        <div className={styles.navLinks}>
          {isLinearRegressionPage ? (
            <>
              <Link href="/home" className={styles.navLink}>Home</Link>
              <Link href="/project" className={styles.navLink}>My Projects</Link>
            </>
          ) : (
            navItems.map(({ href, label }) => (
              <Link key={href} href={href} className={styles.navLink}>
                {label}
              </Link>
            ))
          )}
        </div>

        {/* Center - Tool navigation for linear regression page */}
        {isLinearRegressionPage && (
          <div className={styles.navCenter}>
            <div className={styles.navLinks}>
              {toolNavItems.map(({ label, onClick, icon }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={styles.navLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {icon && <span style={{ fontFamily: 'monospace' }}>{icon}</span>}
                  {label}
                </button>
              ))}
            </div>
            {currentProjectName && (
              <div className={styles.currentProjectBadge} aria-live="polite">
                <span className={styles.currentProjectLabel}>Project</span>
                {renamingProject ? (
                  <div className={styles.projectRenameForm}>
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={projectNameDraft}
                      onChange={(event) => setProjectNameDraft(event.target.value)}
                      onKeyDown={handleRenameKey}
                      onBlur={submitRename}
                      className={styles.projectRenameInput}
                      maxLength={64}
                      aria-label="Project name"
                    />
                    <div className={styles.projectRenameActions}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={submitRename}
                        className={styles.projectRenameButton}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={cancelRename}
                        className={styles.projectRenameButtonSecondary}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.projectNameRow}>
                    <span className={styles.currentProjectName}>{currentProjectName}</span>
                    <button
                      type="button"
                      onClick={beginRename}
                      className={styles.projectRenameTrigger}
                      aria-label="Rename project"
                    >
                      ✏
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trailing side - Auth buttons or account menu */}
        <div className={styles.navLinks} style={{ justifyContent: isLinearRegressionPage ? 'flex-end' : 'flex-start' }}>
          {activeAccount ? (
            <div className={styles.accountContainer} ref={containerRef}>
              <button
                type="button"
                onClick={handleToggleMenu}
                className={styles.accountButton}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <span className={styles.accountLabel}>Account</span>
                <span className={styles.accountName}>{activeAccount}</span>
              </button>
              {menuOpen && (
                <div className={styles.accountDropdown}>
                  <p className={styles.accountDropdownText}>
                    Signed in as <strong>{activeAccount}</strong>
                  </p>
                  <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            authButtons.map(({ href, label, style }) => (
              <Link
                key={href}
                href={href}
                className={style === "primary" ? styles.primaryButton : styles.secondaryButton}
              >
                {label}
              </Link>
            ))
          )}
        </div>
      </div>
    </nav>
  );
}
