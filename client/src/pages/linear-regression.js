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
  "pie-chart": "PieChart",
  "histogram": "Histogram",
  "density-plot": "DensityPlot",
  "box-plot": "BoxPlot"
};
// Normalize stored values back into kebab-case ids
const TOOL_STORAGE_VALUE_TO_ID = {
  LinearRegression: "linear-regression",
  LineChart: "line-chart",
  BarChart: "bar-chart",
  DotPlot: "dot-plot",
  PieChart: "pie-chart",
  Histogram: "histogram",
  DensityPlot: "density-plot",
  BoxPlot: "box-plot"
};

// Normalize any persisted tool identifier, legacy or current, back into the canonical id.
const coerceToolId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (TOOL_ID_TO_STORAGE_VALUE[trimmed]) {
    return trimmed;
  }
  if (TOOL_STORAGE_VALUE_TO_ID[trimmed]) {
    return TOOL_STORAGE_VALUE_TO_ID[trimmed];
  }
  return null;
};

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
    console.error("Failed to parse active project selection", error);
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

// Normalize legacy project payloads so every project exposes imported CSV rows and selected tool.
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

export default function linear() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [activeAccountKey, setActiveAccountKey] = useState(DEFAULT_ACCOUNT_KEY);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const syncActiveProjectSelection = (accountKey, projectId) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(ACTIVE_PROJECTS_KEY);
      const snapshot = parseActiveProjects(raw);
      if (snapshot[accountKey] !== projectId) {
        snapshot[accountKey] = projectId;
        window.localStorage.setItem(ACTIVE_PROJECTS_KEY, JSON.stringify(snapshot));
      }
    } catch (error) {
      console.error("Failed to persist active project selection", error);
    }
  };

  const hydrateProjectContext = useCallback(() => {
    if (typeof window === "undefined" || !router.isReady) {
      return;
    }

    try {
      const storage = window.localStorage;
      const storedAccount = storage.getItem(ACTIVE_ACCOUNT_KEY);
      const normalizedAccount = normalizeAccountKey(storedAccount);
      setActiveAccountKey(normalizedAccount);

      const projectsSnapshot = parseStoredProjects(storage.getItem(STORAGE_KEY));
      const accountProjects = projectsSnapshot.accounts[normalizedAccount]?.projects ?? [];

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
        resolvedProject = withImportedCsvData(resolvedProject);
      }

      if (resolvedProjectId && normalizedAccount) {
        syncActiveProjectSelection(normalizedAccount, resolvedProjectId);
      }

      setActiveProjectId(resolvedProjectId ?? null);
      setCurrentProject(resolvedProject ?? null);
      setProjectHydrated(true);
    } catch (error) {
      console.error("Failed to hydrate project context", error);
      setProjectHydrated(true);
    }
  }, [router.isReady, router.query.projectId]);

  useEffect(() => {
    hydrateProjectContext();
  }, [hydrateProjectContext]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
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
  
  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
        copyToastTimerRef.current = null;
      }
    };
  }, []);
  
  // Pull the hydrated rows every render so the regression hook can receive stable defaults.
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

  // Changing the version triggers the regression hook to rebuild its internal state.
  const projectVersion = projectHydrated ? currentProject?.id ?? activeProjectId : null;

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

  const showCopyToast = useCallback((message, tone = 'success') => {
    setCopyToastMessage(message);
    setCopyToastTone(tone);
    setCopyToastVisible(true);

    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current);
    }

    copyToastTimerRef.current = setTimeout(() => {
      setCopyToastVisible(false);
      copyToastTimerRef.current = null;
    }, 2200);
  }, []);

  const persistImportedCsvData = useCallback(
    (rows) => {
      if (typeof window === "undefined" || activeProjectId === null) {
        return;
      }

      try {
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
          return withImportedCsvData({
            ...project,
            [IMPORTED_CSV_DATA_KEY]: safeRows,
            importedRows: safeRows,
            selectedTool: normalizedToolId,
            [LAST_USED_R_TOOL_KEY]: storageToolValue
          });
        });

        if (!projectExists) {
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

        snapshot.accounts[normalizedAccount] = {
          ...accountState,
          projects: updatedProjects
        };

        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

        const updatedProject = updatedProjects.find((project) => project.id === activeProjectId);
        if (updatedProject) {
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

  const handleProjectRename = useCallback(
    async (nextName) => {
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
  const handlePersistedDataUpdate = useCallback(
    (rowIndex, columnName, newValue) => {
      const updatedRows = updateDataValue(rowIndex, columnName, newValue);
      if (Array.isArray(updatedRows)) {
        persistImportedCsvData(updatedRows);
      }
    },
    [persistImportedCsvData, updateDataValue]
  );
  // Persist the currently selected tool whenever it changes for the active project.
  const persistSelectedTool = useCallback(
    (toolId) => {
      if (typeof window === "undefined" || activeProjectId === null) {
        return;
      }

      const normalizedToolId = coerceToolId(toolId) || DEFAULT_TOOL_ID;
      const lastPersisted = lastPersistedToolRef.current;
      if (
        lastPersisted.projectId === activeProjectId &&
        lastPersisted.toolId === normalizedToolId
      ) {
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
          return withImportedCsvData({
            ...project,
            selectedTool: normalizedToolId,
            [LAST_USED_R_TOOL_KEY]:
              TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
          });
        });

        if (!projectExists) {
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

  const handleToolSelection = useCallback(
    (toolId) => {
      handleToolChange(toolId);

      const normalizedToolId = coerceToolId(toolId) || DEFAULT_TOOL_ID;
      setCurrentProject((prev) => {
        if (!prev) {
          return prev;
        }
        return withImportedCsvData({
          ...prev,
          selectedTool: normalizedToolId,
          [LAST_USED_R_TOOL_KEY]:
            TOOL_ID_TO_STORAGE_VALUE[normalizedToolId] || TOOL_ID_TO_STORAGE_VALUE[DEFAULT_TOOL_ID]
        });
      });

      persistSelectedTool(normalizedToolId);
    },
    [handleToolChange, persistSelectedTool]
  );

  useEffect(() => {
    if (!projectHydrated || activeProjectId === null) {
      return;
    }
    persistSelectedTool(selectedTool);
  }, [projectHydrated, activeProjectId, selectedTool, persistSelectedTool]);

  function handleTriggerImport(e) {
    e.preventDefault();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsedRows = RCodeService.parseCsv(text);
        applyImportedRows(parsedRows, selectedTool);
        persistImportedCsvData(parsedRows);
      } catch (err) {
        console.error('Failed to parse CSV', err);
      }
    };
    reader.readAsText(file);
    // Reset input so selecting the same file again retriggers change
    event.target.value = '';
  }

  function handleColumnSelectionChange(type, columnName, isSelected = true) {
    updateColumnSelection(type, columnName, isSelected);
  }

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
      case 'histogram':
        return valueColumn;
      case 'density-plot':
        return valueColumn;
      case 'box-plot':
        return valueColumn;
      default:
        return false;
    }
  }

  async function handleExport() {
    if (!generatedRCode) {
      console.warn('No R code available to export');
      return;
    }

    // Get tool name for filename
    const toolName = selectedTool.replace(/-/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const suggestedFileName = `${toolName}_${timestamp}.R`;

    try {
      // Create blob with R code content
      const blob = new Blob([generatedRCode], { type: 'text/x-r' });

      // Check if File System Access API is supported
      if ('showSaveFilePicker' in window) {
        try {
          // Use File System Access API for better UX
          const handle = await window.showSaveFilePicker({
            suggestedName: suggestedFileName,
            types: [{
              description: 'R Script',
              accept: { 'text/x-r': ['.R'] },
            }],
          });

          // Create a writable stream
          const writable = await handle.createWritable();

          // Write the blob to the file
          await writable.write(blob);

          // Close the file and write the contents to disk
          await writable.close();

          console.log('R script exported successfully');
        } catch (err) {
          // User cancelled the save dialog or permission denied
          if (err.name !== 'AbortError') {
            console.error('Error using File System Access API:', err);
            // Fall back to traditional download
            fallbackDownload(blob, suggestedFileName);
          }
        }
      } else {
        // Fallback for browsers that do not support the File System Access API
        fallbackDownload(blob, suggestedFileName);
      }
    } catch (err) {
      console.error('Error exporting R code:', err);
    }
  }

  async function handleCopyRCode() {
    if (!generatedRCode) {
      console.warn('No R code available to copy');
      showCopyToast('No R code available to copy', 'error');
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      console.warn('Clipboard access is unavailable during server-side rendering');
      showCopyToast('Clipboard unavailable in this environment', 'error');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedRCode);
        console.log('R code copied to clipboard');
        showCopyToast('R code copied to clipboard');
        return;
      }
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to buffer copy', err);
    }

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
        selection.removeAllRanges();
        previousRanges.forEach((range) => selection.addRange(range));
      }
    }
  }

  function fallbackDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
      case 'histogram':
        return `Generated R code for histogram using ${valueColumn} as the data variable.`;
      case 'density-plot':
        return `Generated R code for density plot using ${valueColumn} as the data variable.`;
      case 'box-plot':
        return `Generated R code for box plot using ${valueColumn} as the data variable.`;
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
    },
    {
      id: "histogram",
      name: "Histogram",
      description: "Display the distribution of a single numeric variable using bars.",
      icon: "📊",
      color: "#8e44ad",
      chartIcon: "📊",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Create histogram
hist(
  values,
  main = "Histogram Example",
  xlab = "Values",
  ylab = "Frequency",
  col = "lightblue",
  border = "black",
  breaks = 10
)`,
      codeDescription: "Creates a histogram showing the distribution of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 },
        { value: 23 },
        { value: 28 },
        { value: 32 },
        { value: 30 },
        { value: 35 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "Main Title", value: "Histogram Example", readOnly: false },
        { name: "X-axis Label", value: "Values", readOnly: false },
        { name: "Y-axis Label", value: "Frequency", readOnly: false },
        { name: "Color", value: "lightblue", readOnly: false },
        { name: "Number of Bins", value: "10", readOnly: false }
      ]
    },
    {
      id: "density-plot",
      name: "Density Plot",
      description: "Display the probability density function of a numeric variable.",
      icon: "📈",
      color: "#27ae60",
      chartIcon: "📈",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Create density plot
plot(
  density(values),
  main = "Density Plot Example",
  xlab = "Values",
  ylab = "Density",
  col = "blue",
  lwd = 2
)

# Add polygon for filled area
polygon(density(values), col = "lightblue", border = "blue")`,
      codeDescription: "Creates a density plot showing the probability distribution of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 },
        { value: 23 },
        { value: 28 },
        { value: 32 },
        { value: 30 },
        { value: 35 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "Main Title", value: "Density Plot Example", readOnly: false },
        { name: "X-axis Label", value: "Values", readOnly: false },
        { name: "Y-axis Label", value: "Density", readOnly: false },
        { name: "Line Color", value: "blue", readOnly: false },
        { name: "Line Width", value: "2", readOnly: false }
      ]
    },
    {
      id: "box-plot",
      name: "Box Plot",
      description: "Display the distribution of data using quartiles and outliers.",
      icon: "📦",
      color: "#e67e22",
      chartIcon: "📦",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Create box plot
boxplot(
  values,
  main = "Box Plot Example",
  ylab = "Values",
  col = "lightgreen",
  border = "darkgreen",
  horizontal = FALSE
)`,
      codeDescription: "Creates a box plot showing quartiles, median, and outliers of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 },
        { value: 23 },
        { value: 28 },
        { value: 32 },
        { value: 30 },
        { value: 35 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "Main Title", value: "Box Plot Example", readOnly: false },
        { name: "Y-axis Label", value: "Values", readOnly: false },
        { name: "Color", value: "lightgreen", readOnly: false },
        { name: "Border Color", value: "darkgreen", readOnly: false },
        { name: "Horizontal", value: "FALSE", readOnly: false }
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
                {selectedTool === 'histogram' && (
                  <>
                    <p><strong>Value Column:</strong> {valueColumn || 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'density-plot' && (
                  <>
                    <p><strong>Value Column:</strong> {valueColumn || 'None selected'}</p>
                  </>
                )}
                {selectedTool === 'box-plot' && (
                  <>
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
