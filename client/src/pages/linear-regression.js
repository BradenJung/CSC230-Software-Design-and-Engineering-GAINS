import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/header";
import { EditableDataTable } from "../components/EditableDataTable";
import { useLinearRegression } from "../logic/useLinearRegression";
import { RCodeService } from "../logic/RCodeService";
import styles from "../styles/Home.module.css";

const STORAGE_KEY = "gains-projects";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const ACTIVE_PROJECTS_KEY = "gains.activeProjects";
const DEFAULT_ACCOUNT_KEY = "__guest__";
const IMPORTED_CSV_DATA_KEY = "importedCsvData";
const LAST_USED_R_TOOL_KEY = "lastUsedRTool";
const DEFAULT_TOOL_ID = "linear-regression";
// Shared map allows us to round-trip tool ids between React state and stored PascalCase values.
// Map internal ids to storage-safe PascalCase variants (dot plot included)
const TOOL_ID_TO_STORAGE_VALUE = {
  "linear-regression": "LinearRegression",
  "line-chart": "LineChart",
  "bar-chart": "BarChart",
  "dot-plot": "DotPlot",
  "pie-chart": "PieChart"
};
// Normalize stored values back into kebab-case ids
const TOOL_STORAGE_VALUE_TO_ID = {
  LinearRegression: "linear-regression",
  LineChart: "line-chart",
  BarChart: "bar-chart",
  DotPlot: "dot-plot",
  PieChart: "pie-chart"
};

// Turn whatever tool id we stored earlier back into the format this page expects.
const coerceToolId = (value) => {
  // If this is not a string, we give up.
  if (typeof value !== "string") {
    return null;
  }
  // Clean up surrounding spaces.
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  // If it already matches our internal id, return it.
  if (TOOL_ID_TO_STORAGE_VALUE[trimmed]) {
    return trimmed;
  }
  // Otherwise try to translate the stored PascalCase version.
  if (TOOL_STORAGE_VALUE_TO_ID[trimmed]) {
    return TOOL_STORAGE_VALUE_TO_ID[trimmed];
  }
  return null;
};

// Lowercase account names and trim spaces.
const normalizeAccountKey = (accountName) => {
  if (!accountName || typeof accountName !== "string") {
    return DEFAULT_ACCOUNT_KEY;
  }
  const normalized = accountName.trim().toLowerCase();
  // Fall back to the guest account if nothing usable is left.
  return normalized || DEFAULT_ACCOUNT_KEY;
};

// Get saved projects from localStorage and fix older formats.
const parseStoredProjects = (raw) => {
  const base = { accounts: {} };
  if (!raw) {
    return base;
  }

  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      if (Array.isArray(data.projects)) {
        // Older saves put projects directly under "projects".
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
            // For newer saves, copy projects per account and tidy the account name.
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

// Read back which project was active per account.
const parseActiveProjects = (raw) => {
  if (!raw) {
    return {};
  }
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      // We expect a plain object shaped like {accountKey: projectId}.
      return data;
    }
  } catch (error) {
    console.error("Failed to parse active project selection", error);
  }
  return {};
};

// Turn whatever comes from the router or storage into a number we can compare.
const parseProjectId = (value) => {
  if (Array.isArray(value)) {
    // Next.js query params can be arrays, so pick the first item.
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

// Make sure a project always has data rows and a selected tool in the format we expect.
const withImportedCsvData = (project) => {
  // If we did not get a real object, just return it untouched.
  if (!project || typeof project !== "object") {
    return project;
  }
  // Look for rows under the new key, but keep old saves working too.
  const importedCsvData = Array.isArray(project[IMPORTED_CSV_DATA_KEY])
    ? project[IMPORTED_CSV_DATA_KEY]
    : [];
  const importedRows = Array.isArray(project.importedRows)
    ? project.importedRows
    : importedCsvData;
  // Figure out which tool this project was using last time.
  const normalizedToolId =
    coerceToolId(project[LAST_USED_R_TOOL_KEY]) ||
    coerceToolId(project.selectedTool) ||
    DEFAULT_TOOL_ID;
  return {
    ...project,
    [IMPORTED_CSV_DATA_KEY]: importedCsvData,
    importedRows,
    selectedTool: normalizedToolId,
    [LAST_USED_R_TOOL_KEY]: TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
  };
};

// Main page component for the regression tool.
export default function linear() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [activeAccountKey, setActiveAccountKey] = useState(DEFAULT_ACCOUNT_KEY);
  const [activeProjectId, setActiveProjectId] = useState(null);

  // Save which project is open so we can come back to it later.
  const syncActiveProjectSelection = (accountKey, projectId) => {
    // Skip this on the server where localStorage does not exist.
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(ACTIVE_PROJECTS_KEY);
      const snapshot = parseActiveProjects(raw);
      // Only write when the value actually changed.
      if (snapshot[accountKey] !== projectId) {
        snapshot[accountKey] = projectId;
        window.localStorage.setItem(ACTIVE_PROJECTS_KEY, JSON.stringify(snapshot));
      }
    } catch (error) {
      console.error("Failed to persist active project selection", error);
    }
  };

  // Load account and project info from localStorage and the URL.
  const hydrateProjectContext = useCallback(() => {
    // Wait until we are on the client and router has the query ready.
    if (typeof window === "undefined" || !router.isReady) {
      return;
    }

    try {
      // Pull the active account and saved projects from localStorage.
      const storage = window.localStorage;
      const storedAccount = storage.getItem(ACTIVE_ACCOUNT_KEY);
      const normalizedAccount = normalizeAccountKey(storedAccount);
      setActiveAccountKey(normalizedAccount);

      // Grab every project for this account and clean it up.
      const projectsSnapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
      const accountProjects = projectsSnapshot.accounts[normalizedAccount]?.projects ?? [];

      // Decide which project id to use: URL beats saved value.
      const activeProjectsSnapshot = parseActiveProjects(storage.getItem(ACTIVE_PROJECTS_KEY));
      const queryProjectId = parseProjectId(router.query.projectId);
      const storedProjectId = parseProjectId(activeProjectsSnapshot[normalizedAccount]);

      let resolvedProjectId = queryProjectId || storedProjectId;
      let resolvedProject = accountProjects.find((project) => project.id === resolvedProjectId);

      if (!resolvedProject && accountProjects.length > 0) {
        [resolvedProject] = accountProjects;
        resolvedProjectId = resolvedProject?.id ?? null;
      }

      if (resolvedProject) {
        // Fill in any missing project fields.
        resolvedProject = withImportedCsvData(resolvedProject);
      }

      if (resolvedProjectId && normalizedAccount) {
        syncActiveProjectSelection(normalizedAccount, resolvedProjectId);
      }

      setActiveProjectId(resolvedProjectId ?? null);
      setCurrentProject(resolvedProject ?? null);
      // Mark loading as done.
      setProjectHydrated(true);
    } catch (error) {
      console.error("Failed to hydrate project context", error);
      setProjectHydrated(true);
    }
  }, [router.isReady, router.query.projectId]);

  // Load initial data once the helper above is ready.
  useEffect(() => {
    hydrateProjectContext();
  }, [hydrateProjectContext]);

  // Watch for changes in other tabs so this page stays up to date.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // When a relevant key changes, reload our project data.
    const handleStorage = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === ACTIVE_PROJECTS_KEY ||
        event.key === ACTIVE_ACCOUNT_KEY
      ) {
        hydrateProjectContext();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [hydrateProjectContext]);
  
  // Stop the copy toast timer when the page goes away.
  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
        copyToastTimerRef.current = null;
      }
    };
  }, []);
  
  // Give the hook a clean list of rows, even during loading.
  const resolvedImportedRows = useMemo(() => {
    if (!projectHydrated || !currentProject) {
      return [];
    }
    return Array.isArray(currentProject.importedRows)
      ? currentProject.importedRows
      : Array.isArray(currentProject[IMPORTED_CSV_DATA_KEY])
        ? currentProject[IMPORTED_CSV_DATA_KEY]
        : [];
  }, [projectHydrated, currentProject]);

  // Remember which tool the project used last. Default to linear regression.
  const resolvedSelectedTool = useMemo(() => {
    if (!projectHydrated || !currentProject) {
      return DEFAULT_TOOL_ID;
    }
    return (
      coerceToolId(currentProject[LAST_USED_R_TOOL_KEY]) ||
      coerceToolId(currentProject.selectedTool) ||
      DEFAULT_TOOL_ID
    );
  }, [projectHydrated, currentProject]);

  // Changing this number makes the hook refresh its data.
  const projectVersion = projectHydrated ? currentProject?.id ?? activeProjectId : null;

  // This hook handles table edits and R code generation.
  const {
    selectedTool,
    importedRows,
    responseColumn,
    predictorColumns,
    categoryColumn,
    valueColumn,
    timeColumn,
    xColumn,
    yColumn,
    isRightPanelVisible,
    generatedRCode,
    generatedArguments,
    availableColumns,
    validation,
    handleToolChange,
    applyImportedRows,
    updateDataValue,
    updateColumnSelection,
    toggleRightPanel
  } = useLinearRegression({
    initialRows: resolvedImportedRows,
    initialTool: resolvedSelectedTool,
    projectVersion
  });
  // Tracks the most recent project/tool combo we wrote so we can avoid redundant storage churn.
  const lastPersistedToolRef = useRef({ projectId: null, toolId: null });
  const copyToastTimerRef = useRef(null);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState('');
  const [copyToastTone, setCopyToastTone] = useState('success');

  // Show a quick message when we copy code or fail to do so.
  const showCopyToast = useCallback((message, tone = 'success') => {
    setCopyToastMessage(message);
    setCopyToastTone(tone);
    setCopyToastVisible(true);

    if (copyToastTimerRef.current) {
      // Restart the timer if a toast is already showing.
      clearTimeout(copyToastTimerRef.current);
    }

    copyToastTimerRef.current = setTimeout(() => {
      setCopyToastVisible(false);
      copyToastTimerRef.current = null;
    }, 2200);
  }, []);

  // Save the latest table rows and tool choice into localStorage.
  const persistImportedCsvData = useCallback(
    (rows) => {
      if (typeof window === "undefined" || activeProjectId === null) {
        return;
      }

      try {
        // Read the current save for this account.
        const storage = window.localStorage;
        const snapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
        const normalizedAccount = normalizeAccountKey(activeAccountKey);
        const accountState = snapshot.accounts[normalizedAccount] || { projects: [], nextIndex: 1 };
        const safeRows = Array.isArray(rows) ? rows : [];
        const normalizedToolId = coerceToolId(selectedTool) || DEFAULT_TOOL_ID;
        const storageToolValue =
          TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID];

        let projectExists = false;
        const updatedProjects = accountState.projects.map((project) => {
          if (project.id !== activeProjectId) {
            return project;
          }
          projectExists = true;
          // Swap in the new rows while keeping everything else.
          return withImportedCsvData({
            ...project,
            [IMPORTED_CSV_DATA_KEY]: safeRows,
            importedRows: safeRows,
            selectedTool: normalizedToolId,
            [LAST_USED_R_TOOL_KEY]: storageToolValue
          });
        });

        if (!projectExists) {
          // If this project does not exist yet, add it now.
          updatedProjects.push(
            withImportedCsvData({
              id: activeProjectId,
              name: currentProject?.name || `Project ${activeProjectId}`,
              [IMPORTED_CSV_DATA_KEY]: safeRows,
              importedRows: safeRows,
              selectedTool: normalizedToolId,
              [LAST_USED_R_TOOL_KEY]: storageToolValue
            })
          );
        }

        // Write the updated project array back into the snapshot.
        snapshot.accounts[normalizedAccount] = {
          ...accountState,
          projects: updatedProjects
        };

        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

        const updatedProject = updatedProjects.find((project) => project.id === activeProjectId);
        if (updatedProject) {
          // Update state so the page shows the saved data right away.
          setCurrentProject(withImportedCsvData(updatedProject));
        }
        lastPersistedToolRef.current = {
          projectId: activeProjectId,
          toolId: normalizedToolId
        };
      } catch (error) {
        console.error("Failed to persist imported CSV data", error);
      }
    },
    [activeAccountKey, activeProjectId, currentProject, selectedTool]
  );

  // Rename the current project in memory and in localStorage.
  const handleProjectRename = useCallback(
    async (nextName) => {
      // Do nothing if the new name is empty.
      const trimmed = (nextName || '').trim();
      if (!trimmed) {
        return false;
      }

      if (typeof window === "undefined" || activeProjectId === null) {
        return false;
      }

      try {
        const storage = window.localStorage;
        const snapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
        const normalizedAccount = normalizeAccountKey(activeAccountKey);
        const accountState = snapshot.accounts[normalizedAccount] || { projects: [], nextIndex: 1 };
        const projects = Array.isArray(accountState.projects) ? accountState.projects : [];

        if (projects.length === 0) {
          return false;
        }

        let updatedProject = null;
        const updatedProjects = projects.map((project) => {
          if (project.id !== activeProjectId) {
            return project;
          }
          // Save the new name so we can update state below.
          updatedProject = { ...project, name: trimmed };
          return updatedProject;
        });

        if (!updatedProject) {
          return false;
        }

        snapshot.accounts[normalizedAccount] = {
          ...accountState,
          projects: updatedProjects
        };

        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setCurrentProject(withImportedCsvData(updatedProject));
        return true;
      } catch (error) {
        console.error("Failed to rename project", error);
        return false;
      }
    },
    [activeAccountKey, activeProjectId]
  );
  // Push table edits through the hook, then persist the changed dataset.
  const handlePersistedDataUpdate = useCallback(
    (rowIndex, columnName, newValue) => {
      // The hook gives back the new rows so we can save them.
      const updatedRows = updateDataValue(rowIndex, columnName, newValue);
      if (Array.isArray(updatedRows)) {
        persistImportedCsvData(updatedRows);
      }
    },
    [persistImportedCsvData, updateDataValue]
  );
  // Remember which R tool is active so we can restore it later.
  const persistSelectedTool = useCallback(
    (toolId) => {
      // Skip this if we are on the server or no project is selected.
      if (typeof window === "undefined" || activeProjectId === null) {
        return;
      }

      const normalizedToolId = coerceToolId(toolId) || DEFAULT_TOOL_ID;
      const lastPersisted = lastPersistedToolRef.current;
      if (
        lastPersisted.projectId === activeProjectId &&
        lastPersisted.toolId === normalizedToolId
      ) {
        // If nothing changed, do not write again.
        return;
      }

      try {
        const storage = window.localStorage;
        const snapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
        const normalizedAccount = normalizeAccountKey(activeAccountKey);
        const accountState = snapshot.accounts[normalizedAccount] || { projects: [], nextIndex: 1 };
        let projectExists = false;

        const updatedProjects = accountState.projects.map((project) => {
          if (project.id !== activeProjectId) {
            return project;
          }
          projectExists = true;
          // Change only the tool info and keep the rows the same.
          return withImportedCsvData({
            ...project,
            selectedTool: normalizedToolId,
            [LAST_USED_R_TOOL_KEY]:
              TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
          });
        });

        if (!projectExists) {
          // If this project is brand new, make a simple saved record for it.
          const fallbackRows = Array.isArray(currentProject?.importedRows)
            ? currentProject.importedRows
            : Array.isArray(currentProject?.[IMPORTED_CSV_DATA_KEY])
              ? currentProject[IMPORTED_CSV_DATA_KEY]
              : [];
          updatedProjects.push(
            withImportedCsvData({
              id: activeProjectId,
              name: currentProject?.name || `Project ${activeProjectId}`,
              [IMPORTED_CSV_DATA_KEY]: fallbackRows,
              importedRows: fallbackRows,
              selectedTool: normalizedToolId,
              [LAST_USED_R_TOOL_KEY]:
                TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
            })
          );
        }

        snapshot.accounts[normalizedAccount] = {
          ...accountState,
          projects: updatedProjects
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        lastPersistedToolRef.current = {
          projectId: activeProjectId,
          toolId: normalizedToolId
        };
      } catch (error) {
        console.error("Failed to persist selected R tool", error);
      }
    },
    [activeAccountKey, activeProjectId, currentProject]
  );

  // When the user picks a different tool, update state and storage.
  const handleToolSelection = useCallback(
    (toolId) => {
      handleToolChange(toolId);

      const normalizedToolId = coerceToolId(toolId) || DEFAULT_TOOL_ID;
      setCurrentProject((prev) => {
        if (!prev) {
          return prev;
        }
        // Change the project in memory so the UI updates right away.
        return withImportedCsvData({
          ...prev,
          selectedTool: normalizedToolId,
          [LAST_USED_R_TOOL_KEY]:
            TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
        });
      });

      // Save the choice so we load the same tool next time.
      persistSelectedTool(normalizedToolId);
    },
    [handleToolChange, persistSelectedTool]
  );

  // Once data is loaded, keep storage in sync with the current tool.
  useEffect(() => {
    if (!projectHydrated || activeProjectId === null) {
      return;
    }
    persistSelectedTool(selectedTool);
  }, [projectHydrated, activeProjectId, selectedTool, persistSelectedTool]);

  // Pressing the import button triggers the hidden file input.
  function handleTriggerImport(e) {
    e.preventDefault();
    if (fileInputRef.current) {
      // Fake a click so the browser opens the file picker.
      fileInputRef.current.click();
    }
  }

  // Read the uploaded CSV and push it through the rest of the app.
  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    // FileReader turns the file into text.
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        // Let our CSV helper turn the text into rows.
        const parsedRows = RCodeService.parseCsv(text);
        applyImportedRows(parsedRows, selectedTool);
        persistImportedCsvData(parsedRows);
      } catch (err) {
        console.error('Failed to parse CSV', err);
      }
    };
    reader.readAsText(file);
    // Clear the input so picking the same file later still fires change.
    event.target.value = '';
  }

  // Relay column selections back to the hook.
  function handleColumnSelectionChange(type, columnName, isSelected = true) {
    updateColumnSelection(type, columnName, isSelected);
  }

  // Check that the must-have columns are chosen for the current tool.
  function getCurrentSelectionsValid() {
    switch (selectedTool) {
      case 'linear-regression':
        return responseColumn && predictorColumns.length > 0;
      case 'bar-chart':
        return categoryColumn && valueColumn;
      case 'line-chart':
        return timeColumn && valueColumn;
      case 'dot-plot':
        return xColumn && yColumn;
      case 'pie-chart':
        return categoryColumn && valueColumn;
      default:
        return false;
    }
  }

  // Allows the user to download the generated R code as a .R script.
  async function handleExport() {
    if (!generatedRCode) {
      // Stop here if there is no code yet.
      console.warn('No R code available to export');
      return;
    }

    // Build a file name using the tool name and today's date.
    const toolName = selectedTool.replace(/-/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const suggestedFileName = `${toolName}_${timestamp}.R`;

    try {
      // Turn the R code string into a blob we can save.
      const blob = new Blob([generatedRCode], { type: 'text/x-r' });

      // Some browsers let us show the native save dialog.
      if ('showSaveFilePicker' in window) {
        try {
          // Ask the user where to save the file.
          const handle = await window.showSaveFilePicker({
            suggestedName: suggestedFileName,
            types: [{
              description: 'R Script',
              accept: { 'text/x-r': ['.R'] },
            }],
          });

          // Open the file for writing.
          const writable = await handle.createWritable();

          // Write the blob to disk.
          await writable.write(blob);

          // Finish the write.
          await writable.close();

          console.log('R script exported successfully');
        } catch (err) {
          // If the user cancels we ignore it, otherwise fall back.
          if (err.name !== 'AbortError') {
            console.error('Error using File System Access API:', err);
            // Use the simple download method instead.
            fallbackDownload(blob, suggestedFileName);
          }
        }
      } else {
        // Use the simple download method when the API is missing.
        fallbackDownload(blob, suggestedFileName);
      }
    } catch (err) {
      console.error('Error exporting R code:', err);
    }
  }

  // Copy the R code to the clipboard, using backups for older browsers.
  async function handleCopyRCode() {
    if (!generatedRCode) {
      // Tell the user there is nothing to copy yet.
      console.warn('No R code available to copy');
      showCopyToast('No R code available to copy', 'error');
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      // Clipboard features do not exist during server rendering.
      console.warn('Clipboard access is unavailable during server-side rendering');
      showCopyToast('Clipboard unavailable in this environment', 'error');
      return;
    }

    try {
      // Try the modern clipboard API first.
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedRCode);
        console.log('R code copied to clipboard');
        showCopyToast('R code copied to clipboard');
        return;
      }
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to buffer copy', err);
    }

    // Fall back to the hidden textarea trick for older browsers.
    const buffer = document.createElement('textarea');
    buffer.value = generatedRCode;
    buffer.setAttribute('readonly', '');
    buffer.style.position = 'absolute';
    buffer.style.left = '-9999px';
    buffer.style.top = '0';

    document.body.appendChild(buffer);

    const selection = document.getSelection();
    const previousRanges = [];

    if (selection && selection.rangeCount > 0) {
      for (let i = 0; i < selection.rangeCount; i++) {
        previousRanges.push(selection.getRangeAt(i));
      }
    }

    buffer.select();
    buffer.setSelectionRange(0, buffer.value.length);

    try {
      const succeeded = document.execCommand('copy');
      if (!succeeded) {
        throw new Error('document.execCommand returned false');
      }
      console.log('R code copied to clipboard via fallback buffer');
      showCopyToast('R code copied to clipboard');
      return;
    } catch (err) {
      console.error('Failed to copy R code to clipboard', err);
      showCopyToast('Failed to copy R code', 'error');
    } finally {
      document.body.removeChild(buffer);
      if (selection) {
        // Put back whatever the user had selected.
        selection.removeAllRanges();
        previousRanges.forEach((range) => selection.addRange(range));
      }
    }
  }

  // Simple download helper for browsers without the fancy save dialog.
  function fallbackDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Clean up the blob URL once we are done.
    URL.revokeObjectURL(url);
  }

  // Explain in plain words what the current R code will do.
  function getCodeDescription() {
    switch (selectedTool) {
      case 'linear-regression':
        return `Generated R code for linear regression using ${responseColumn} as response variable and ${predictorColumns.join(', ')} as predictors.`;
      case 'bar-chart':
        return `Generated R code for bar chart using ${categoryColumn} as categories and ${valueColumn} as values.`;
      case 'line-chart':
        return `Generated R code for line chart using ${timeColumn} as time points and ${valueColumn} as values.`;
      case 'dot-plot':
        return `Generated R code for dot plot using ${xColumn} on the x-axis and ${yColumn} on the y-axis.`;
      case 'pie-chart':
        return `Generated R code for pie chart using ${categoryColumn} as categories and ${valueColumn} as values.`;
      default:
        return 'Generated R code based on your data and selections.';
    }
  }

  const tools = [
    {
      id: "linear-regression",
      name: "Linear Regression",
      description: "A model that estimates the relationship between a scalar response.",
      icon: "📊",
      color: "#ff4444",
      chartIcon: "📈",
      rCode: `# Initialize data
df <- data.frame(
  y = c(5, 7, 8, 6, 9),
  x1 = c(1, 2, 3, 4, 5),
  x2 = c(2, 3, 4, 5, 6)
)

# Fit linear model
model <- lm(
  formula = y ~ x1 + x2,
  data = df,
  subset = NULL,
  weights = NULL,
  na.action = na.omit,
  method = "qr",
  model = TRUE,
  x = FALSE,
  y = TRUE,
  qr = TRUE,
  singular.ok = TRUE,
  contrasts = NULL,
  offset = NULL
)`,
      codeDescription: "Creates a linear regression model predicting y using x1 and x2.",
      sampleData: [
        { x1: 5, x2: 2, y: 7 },
        { x1: 4, x2: 3, y: 8 },
        { x1: 3, x2: 4, y: 6 },
        { x1: 6, x2: 5, y: 9 },
        { x1: 3, x2: 6, y: 5 },
        { x1: 5, x2: 7, y: 8 }
      ],
      arguments: [
        { name: "Formula", value: "y ~ x1 + x2", readOnly: true },
        { 
          name: "df (Initialize data)", 
          type: "data",
          data: [
            { label: "y:", value: "5, 7, 8, 6, 9" },
            { label: "x1:", value: "1, 2, 3, 4, 5" },
            { label: "x2:", value: "2, 3, 4, 5, 6" }
          ]
        }
      ]
    },
    {
      id: "bar-chart",
      name: "Bar Chart",
      description: "Visualize the frequency or proportion of categories using bars.",
      icon: "📊",
      color: "#4444ff",
      chartIcon: "📊",
      rCode: `# Initialize data
categories <- c("A", "B", "C", "D", "E")
values <- c(23, 45, 56, 78, 32)

# Create data frame
df <- data.frame(
  category = categories,
  value = values
)

# Create bar chart
barplot(
  height = df$value,
  names.arg = df$category,
  main = "Bar Chart Example",
  xlab = "Categories",
  ylab = "Values",
  col = rainbow(length(categories)),
  border = "black"
)`,
      codeDescription: "Creates a bar chart showing values for different categories.",
      sampleData: [
        { category: "A", value: 23 },
        { category: "B", value: 45 },
        { category: "C", value: 56 },
        { category: "D", value: 78 },
        { category: "E", value: 32 }
      ],
      arguments: [
        { name: "Categories", value: "A, B, C, D, E", readOnly: false },
        { name: "Values", value: "23, 45, 56, 78, 32", readOnly: false },
        { name: "Main Title", value: "Bar Chart Example", readOnly: false },
        { name: "X-axis Label", value: "Categories", readOnly: false },
        { name: "Y-axis Label", value: "Values", readOnly: false }
      ]
    },
    {
      id: "line-chart",
      name: "Line Chart",
      description: "Display trends over time or sequential data.",
      icon: "📈",
      color: "#44ffaa",
      chartIcon: "📈",
      rCode: `# Initialize data
time_points <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35)

# Create data frame
df <- data.frame(
  time = time_points,
  value = values
)

# Create line chart
plot(
  x = df$time,
  y = df$value,
  type = "l",
  main = "Line Chart Example",
  xlab = "Time Points",
  ylab = "Values",
  col = "blue",
  lwd = 2,
  pch = 16
)

# Add points
points(df$time, df$value, col = "red", pch = 16)`,
      codeDescription: "Creates a line chart showing trends over time with data points.",
      sampleData: [
        { time: 1, value: 12 },
        { time: 2, value: 15 },
        { time: 3, value: 18 },
        { time: 4, value: 22 },
        { time: 5, value: 25 },
        { time: 6, value: 23 },
        { time: 7, value: 28 },
        { time: 8, value: 32 },
        { time: 9, value: 30 },
        { time: 10, value: 35 }
      ],
      arguments: [
        { name: "Time Points", value: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", readOnly: false },
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "Main Title", value: "Line Chart Example", readOnly: false },
        { name: "X-axis Label", value: "Time Points", readOnly: false },
        { name: "Y-axis Label", value: "Values", readOnly: false },
        { name: "Line Color", value: "blue", readOnly: false }
      ]
    },
    {
      id: "dot-plot",
      name: "Dot Plot",
      description: "Visualize paired values with a scatter-style dot plot.",
      icon: "⚫️",
      color: "#6f42c1",
      chartIcon: "⚫️",
      rCode: `# Initialize data
x_values <- c(1, 2, 3, 4, 5, 6)
y_values <- c(2.5, 3.1, 4.8, 3.6, 5.2, 4.9)

# Create data frame
df <- data.frame(
  x = x_values,
  y = y_values
)

# Create dot plot / scatter plot
plot(
  x = df$x,
  y = df$y,
  main = "Dot Plot Example",
  xlab = "X Values",
  ylab = "Y Values",
  pch = 19,
  col = "darkgreen"
)

# Add grid for readability
grid(col = "lightgray")`,
      codeDescription: "Creates a dot plot using paired x and y numeric values.",
      // Surface the same defaults shown inside RCodeService for easy copy/paste testing
      sampleData: [
        { x: 1, y: 2.5 },
        { x: 2, y: 3.1 },
        { x: 3, y: 4.8 },
        { x: 4, y: 3.6 },
        { x: 5, y: 5.2 },
        { x: 6, y: 4.9 }
      ],
      arguments: [
        { name: "X Values", value: "1, 2, 3, 4, 5, 6", readOnly: false },
        { name: "Y Values", value: "2.5, 3.1, 4.8, 3.6, 5.2, 4.9", readOnly: false },
        { name: "Main Title", value: "Dot Plot Example", readOnly: false },
        { name: "X-axis Label", value: "X Values", readOnly: false },
        { name: "Y-axis Label", value: "Y Values", readOnly: false },
        { name: "Point Color", value: "darkgreen", readOnly: false },
        { name: "Point Size", value: "1.2", readOnly: false }
      ]
    },
    {
      id: "pie-chart",
      name: "Pie Chart",
      description: "Display proportional data as slices of a circular chart.",
      icon: "🥧",
      color: "#ff6b35",
      chartIcon: "🥧",
      rCode: `# Define the data vector with the number of articles
x <- c(210, 450, 250, 100, 50, 90)

# Define labels for each value in x
names(x) <- c("Algo", "DS", "Java", "C", "C++", "Python")

# Set the output to be a PNG file
png(file = "piechart.png")

# Create the pie chart
pie(x, labels = names(x), col = "white",
    main = "Articles on GeeksforGeeks", radius = -1,
    col.main = "darkgreen")

# Save the file
dev.off()`,
      codeDescription: "Creates a pie chart showing proportional data with labels and saves as PNG.",
      sampleData: [
        { category: "Algo", value: 210 },
        { category: "DS", value: 450 },
        { category: "Java", value: 250 },
        { category: "C", value: 100 },
        { category: "C++", value: 50 },
        { category: "Python", value: 90 }
      ],
      arguments: [
        { name: "Categories", value: "Algo, DS, Java, C, C++, Python", readOnly: false },
        { name: "Values", value: "210, 450, 250, 100, 50, 90", readOnly: false },
        { name: "Main Title", value: "Articles on GeeksforGeeks", readOnly: false },
        { name: "Output File", value: "piechart.png", readOnly: false },
        { name: "Colors", value: "white", readOnly: false },
        { name: "Title Color", value: "darkgreen", readOnly: false }
      ]
    }
  ];

  // Get current tool configuration
  const currentTool = tools.find(tool => tool.id === selectedTool);
  const currentProjectName = currentProject?.name || (projectHydrated ? "Untitled Project" : "");

  return (
    <>
      <Head>
        <title>Select R Tool</title>
        <meta name="description" content="R programming language tools dashboard for statistical students" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header
        onImportClick={handleTriggerImport}
        onEditClick={toggleRightPanel}
        onExportClick={handleExport}
        onCopyClick={handleCopyRCode}
        onProjectRename={handleProjectRename}
        isRightPanelVisible={isRightPanelVisible}
        currentProjectName={projectHydrated ? currentProjectName : undefined}
      />

      <div
        className={`${styles.copyToast} ${copyToastVisible ? styles.copyToastVisible : ''} ${copyToastTone === 'error' ? styles.copyToastError : styles.copyToastSuccess}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.copyToastIcon}>
          {copyToastTone === 'error' ? '⚠️' : '✅'}
        </span>
        <span>{copyToastMessage}</span>
      </div>

      <div className={styles.dashboard}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className={isRightPanelVisible ? styles.mainContent : styles.mainContentNoRightPanel}>
          {/* Left Panel - Tool Selection */}
          <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
              <h2>Select R Tool</h2>
              <p>Select one of the provided RStudio tools.</p>
            </div>
            
            <div className={styles.toolList}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className={`${styles.toolCard} ${selectedTool === tool.id ? styles.selected : ''}`}
                  onClick={() => handleToolSelection(tool.id)}
                >
                  <div className={styles.toolIcon} style={{ color: tool.color }}>
                    {tool.icon}
                  </div>
                  <div className={styles.toolInfo}>
                    <h3>{tool.name}</h3>
                    <p>{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel - Tool Details */}
          <div className={styles.centerPanel}>
            <div className={styles.toolDetails}>
              <div className={styles.toolHeader}>
                <h1>{currentTool?.name}</h1>
                <p>{currentTool?.description}</p>
              </div>
              
              <div className={styles.toolVisual}>
                <div className={styles.chartIcon} style={{ color: currentTool?.color }}>
                  {currentTool?.chartIcon}
                </div>
              </div>
            </div>

            {/* Data Table / Placeholder */}
            <EditableDataTable
              data={importedRows}
              onDataUpdate={handlePersistedDataUpdate}
              selectedTool={selectedTool}
              responseColumn={responseColumn}
              predictorColumns={predictorColumns}
              categoryColumn={categoryColumn}
              valueColumn={valueColumn}
              timeColumn={timeColumn}
              xColumn={xColumn}
              yColumn={yColumn}
              onColumnSelectionChange={handleColumnSelectionChange}
            />

            {/* Validation Messages */}
            {!validation.isValid && (
              <div className={styles.validationErrors}>
                <h4>Data Validation Issues:</h4>
                <ul>
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Column Selection Info */}
            {importedRows.length > 0 && (
              <div className={styles.columnSelectionInfo}>
                <h4>Column Selection:</h4>
                {selectedTool === 'linear-regression' && (
                  <>
                    <p><strong>Response Variable:</strong> {responseColumn || 'None selected'}</p>
                    <p><strong>Predictor Variables:</strong> {predictorColumns.length > 0 ? predictorColumns.join(', ') : 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'bar-chart' && (
                  <>
                    <p><strong>Category Column:</strong> {categoryColumn || 'None selected'}</p>
                    <p><strong>Value Column:</strong> {valueColumn || 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'line-chart' && (
                  <>
                    <p><strong>Time Column:</strong> {timeColumn || 'None selected'}</p>
                    <p><strong>Value Column:</strong> {valueColumn || 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'dot-plot' && (
                  <>
                    <p><strong>X Column:</strong> {xColumn || 'None selected'}</p>
                    <p><strong>Y Column:</strong> {yColumn || 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'pie-chart' && (
                  <>
                    <p><strong>Category Column:</strong> {categoryColumn || 'None selected'}</p>
                    <p><strong>Value Column:</strong> {valueColumn || 'None selected'}</p>
                  </>
                )}
                <p className={styles.columnSelectionHint}>
                  Click on column headers to select variables. The R code will update automatically.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Code and Arguments */}
          {isRightPanelVisible && (
            <div className={styles.rightPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.headerActions}>
                <div className={styles.vrIcon}>VR</div>
                <button className={styles.switchBtn}>Switch R Tool</button>
              </div>
            </div>

            <div className={styles.codeSection}>
              <div className={styles.sectionHeader}>
                <h3>Code Snippet</h3>
                <span className={styles.expandIcon}>+</span>
              </div>
              <div className={styles.codeBlock}>
                <pre><code>{generatedRCode}</code></pre>
              </div>
              <p className={styles.codeDescription}>
                {importedRows.length > 0 && getCurrentSelectionsValid() 
                  ? getCodeDescription()
                  : `Default R code for ${selectedTool.replace('-', ' ')}. Import data and select variables to generate custom code.`
                }
              </p>
            </div>

            <div className={styles.argumentsSection}>
              <h3>Arguments</h3>
              {generatedArguments?.map((arg, index) => (
                <div key={index} className={styles.argumentGroup}>
                  <label>{arg.name}</label>
                  {arg.type === "data" ? (
                    <div className={styles.dataInputs}>
                      {arg.data?.map((dataItem, dataIndex) => (
                        <div key={dataIndex} className={styles.dataInput}>
                          <label>{dataItem.label}</label>
                          <input type="text" value={dataItem.value} readOnly />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={arg.value} readOnly={arg.readOnly} />
                  )}
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
