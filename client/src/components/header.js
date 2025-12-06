import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { logout } from "../api/api";

const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const AUTH_CHANGE_EVENT = "gains-auth-change";

export default function Header({
  onImportClick,
  onEditClick,
  onExportClick,
  onPreviewClick = () => {},
  onProjectRename = () => {},
  isPreviewAvailable = false,
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
  const handleSignOut = async () => {
    const identifier =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_ACCOUNT_KEY)
        : activeAccount;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { accountName: null } }));
    }

    try {
      await logout({ accountName: identifier });
    } catch (error) {
      console.warn("Unable to record logout", error);
    }

    setActiveAccount(null);
    setMenuOpen(false);
    router.push("/login");
  };

  // Check if we're on the dashboard page
  const isDashboardPage = router.pathname === '/dashboard';

  const [projectNameDraft, setProjectNameDraft] = useState(currentProjectName || "");
  const renameInputRef = useRef(null);

  useEffect(() => {
    setProjectNameDraft(currentProjectName || "");
  }, [currentProjectName]);

  const submitRename = async () => {
    const trimmed = (projectNameDraft || "").trim();
    if (!trimmed || trimmed === currentProjectName) {
      setProjectNameDraft(currentProjectName || "");
      return;
    }
    try {
      const result = await onProjectRename(trimmed);
      if (result === false) {
        return;
      }
      setProjectNameDraft(trimmed);
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
      setProjectNameDraft(currentProjectName || "");
      if (renameInputRef.current) {
        renameInputRef.current.blur();
      }
    }
  };

  // Surface every routable page so teammates can reach each screen quickly
  const navItems = [
    { href: "/home", label: "Home" },
    { href: "/project", label: "My Projects" },
    { href: "/learn", label: "Learn" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/chat", label: "Chat"}
  ];

  // Tool-specific navigation items for the dashboard page
  const toolNavItems = [
    { label: "Edit", onClick: onEditClick },
    { label: "Import", onClick: onImportClick },
    { label: "Export", onClick: onExportClick },
    { label: "Preview", onClick: onPreviewClick, disabled: !isPreviewAvailable },
  ];

  const authButtons = [
    { href: "/login", label: "Sign In", style: "secondary" },
    { href: "/signup", label: "Sign Up", style: "primary" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={isDashboardPage ? styles.navFlexThreeColumn : styles.navFlex}>
        {/* Leading side - Home and My Projects for dashboard page, or full nav for other pages */}
        <div className={styles.navLinks}>
          {isDashboardPage ? (
            <>
              <Link href="/home" className={styles.navLink}>Home</Link>
              <Link href="/project" className={styles.navLink}>My Projects</Link>
              {currentProjectName && (
                <div className={styles.currentProjectBadge} aria-live="polite">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={projectNameDraft}
                    onChange={(event) => setProjectNameDraft(event.target.value)}
                    onKeyDown={handleRenameKey}
                    className={styles.projectRenameInput}
                    maxLength={64}
                    aria-label="Project name"
                    placeholder="Name your project"
                  />
                  <div className={styles.projectRenameActions}>
                    <button
                      type="button"
                      className={styles.projectRenameCancelButton}
                      onClick={() => {
                        setProjectNameDraft(currentProjectName || "");
                        if (renameInputRef.current) {
                          renameInputRef.current.blur();
                        }
                      }}
                      aria-label="Cancel rename"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className={styles.projectRenameSaveButton}
                      onClick={submitRename}
                      aria-label="Save project name"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            navItems.map(({ href, label }) => (
              <Link key={href} href={href} className={styles.navLink}>
                {label}
              </Link>
            ))
          )}
        </div>

        {/* Center - Tool navigation for dashboard page */}
        {isDashboardPage && (
          <div className={styles.navCenter}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                justifyContent: "center"
              }}
            >
              <div className={styles.navLinks} style={{ paddingRight: 0, marginRight: 0 }}>
                {toolNavItems.filter(item => item.label !== "Preview").map(({ label, onClick, icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className={styles.navLink}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {icon && <span style={{ fontFamily: "monospace" }}>{icon}</span>}
                    {label}
                  </button>
                ))}
              </div>
              {(() => {
                const previewItem = toolNavItems.find(item => item.label === "Preview");
                if (!previewItem) {
                  return null;
                }
                return (
                  <button
                    type="button"
                    onClick={previewItem.onClick}
                    disabled={previewItem.disabled}
                    className={styles.primaryButton}
                    style={{
                      minWidth: 110,
                      padding: "10px 18px",
                      opacity: 1,
                      cursor: previewItem.disabled ? "not-allowed" : "pointer",
                      background: previewItem.disabled ? "transparent" : undefined,
                      border: previewItem.disabled ? "1px solid rgba(255,255,255,0.4)" : "none",
                      color: previewItem.disabled ? "rgba(255,255,255,0.6)" : undefined,
                      boxShadow: previewItem.disabled ? "none" : undefined
                    }}
                  >
                    Preview
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* Trailing side - Auth buttons or account menu */}
        <div className={styles.navLinks} style={{ justifyContent: isDashboardPage ? 'flex-end' : 'flex-start' }}>
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
