'use client';

import { useEffect, useState } from "react";
import styles from "../styles/AccessibilityButton.module.css";

const THEME_STORAGE_KEY = "gains.theme";

export default function AccessibilityButton({ onClick, title = "Open accessibility options" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  const applyTheme = (mode) => {
    if (typeof document === "undefined") {
      return;
    }

    const isLight = mode === "light";
    document.body.classList.toggle("theme-light", isLight);
    document.documentElement.classList.toggle("theme-light", isLight);
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (onClick) {
      onClick();
    }
  };

  const handleThemeToggle = () => {
    setIsLightMode((prev) => {
      const nextIsLight = !prev;
      const mode = nextIsLight ? "light" : "dark";
      applyTheme(mode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
      return nextIsLight;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialMode = storedTheme === "light" ? "light" : "dark";
    setIsLightMode(initialMode === "light");
    applyTheme(initialMode);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={styles.accessibilityButton}
        aria-label={title}
        aria-expanded={isOpen}
        title={title}
      >
        Accessibility
      </button>

      {isOpen && (
        <div className={styles.panel} role="dialog" aria-label="Accessibility options">
          <p className={styles.panelTitle}>Accessibility</p>
          <div className={styles.controlRow}>
            <button
              type="button"
              onClick={handleThemeToggle}
              className={`${styles.circleButton} ${isLightMode ? styles.circleButtonActive : ""}`}
              aria-pressed={isLightMode}
              aria-label="Toggle light mode"
            >
              ☀
            </button>
            <button type="button" className={styles.circleButton} aria-label="Sample option 2">
              A+
            </button>
            <button type="button" className={styles.circleButton} aria-label="Sample option 3">
              A-
            </button>
          </div>
        </div>
      )}
    </>
  );
}
