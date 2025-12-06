'use client';

import { useEffect, useState } from "react";
import styles from "../styles/AccessibilityButton.module.css";

const THEME_STORAGE_KEY = "gains.theme";

const SunIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm8-7a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1ZM5 12a1 1 0 0 1-1 1 1 1 0 1 1 0-2 1 1 0 0 1 1 1Zm12.95-6.364a1 1 0 0 1 1.414 0l.708.707a1 1 0 0 1-1.414 1.414l-.708-.707a1 1 0 0 1 0-1.414ZM4.636 17.95a1 1 0 0 1 1.414 0l.707.708a1 1 0 0 1-1.414 1.414l-.707-.708a1 1 0 0 1 0-1.414Zm13.435 0a1 1 0 0 1 1.414 1.414l-.708.708a1 1 0 0 1-1.414-1.414l.708-.708ZM6.757 5.636a1 1 0 1 1-1.414-1.414l.707-.708A1 1 0 1 1 7.464 5.93l-.707-.707Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M21 14a9 9 0 0 1-11.8-11A9 9 0 1 0 21 14Z"
    />
  </svg>
);

export default function AccessibilityButton({ title = "Toggle light mode" }) {
  const [isLightMode, setIsLightMode] = useState(false);

  const applyTheme = (mode) => {
    if (typeof document === "undefined") {
      return;
    }

    const isLight = mode === "light";
    document.body.classList.toggle("theme-light", isLight);
    document.documentElement.classList.toggle("theme-light", isLight);
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
    <button
      type="button"
      onClick={handleThemeToggle}
      className={styles.accessibilityButton}
      aria-label={isLightMode ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLightMode}
      title={title}
    >
      {isLightMode ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
