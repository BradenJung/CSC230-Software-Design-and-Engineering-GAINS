/**
 * R Tools Dashboard Page
 * 
 * This page provides a comprehensive dashboard for various R statistical tools including:
 * - Data visualizations (bar charts, line charts, histograms, etc.)
 * - Statistical models (linear regression, ANOVA)
 * - Statistical functions (IQR, standard deviation, median, etc.)
 * - Utility functions (read CSV, combinations, permutations, etc.)
 * 
 * Users can import CSV data, select appropriate columns, and generate R code
 * for their analysis needs.
 */
import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/header";
import { EditableDataTable } from "../components/EditableDataTable";
import { useRDashboard } from "../logic/useLinearRegression";
import { RCodeService } from "../logic/RCodeService";
import styles from "../styles/Home.module.css";
import AccessibilityButton from "../components/AccessibilityButton";
import CodexTool from "../components/CodexTool";
import ScatterplotTool from "../components/scatterplot";
import HistogramTool from "../components/histogram";
import DensityTool from "../components/densityplot";
import PieChartTool from "../components/piechart";
import BoxplotTool from "../components/boxplot";
import BarChartTool from "../components/barchart";
import LinearRegressionPreview from "../components/linearregression";
import RCodeHighlight from "../components/RCodeHighlight";

const STORAGE_KEY = "gains-projects";
const ACTIVE_ACCOUNT_KEY = "gains.activeAccount";
const ACTIVE_PROJECTS_KEY = "gains.activeProjects";
const DEFAULT_ACCOUNT_KEY = "__guest__";
const IMPORTED_CSV_DATA_KEY = "importedCsvData";
const LAST_USED_R_TOOL_KEY = "lastUsedRTool";
const DEFAULT_TOOL_ID = "linear-regression";
const TOOL_PREVIEW_COMPONENTS = {
  "linear-regression": {
    title: "Linear Regression Preview",
    Component: LinearRegressionPreview,
    isReady: ({ importedRows, responseColumn, predictorColumns }) =>
      Array.isArray(importedRows) &&
      importedRows.length > 0 &&
      Boolean(responseColumn) &&
      Array.isArray(predictorColumns) &&
      predictorColumns.length > 0,
    getProps: ({ importedRows, responseColumn, predictorColumns }) => ({
      dataRows: importedRows,
      responseColumn,
      predictorColumns,
      defaultTitle:
        responseColumn && predictorColumns?.length
          ? `${responseColumn} ~ ${predictorColumns.join(", ")}`
          : "Linear Regression Preview"
    })
  },
  "bar-chart": {
    title: "Bar Chart Preview",
    Component: BarChartTool,
    isReady: ({ importedRows, categoryColumn, valueColumn }) =>
      Array.isArray(importedRows) &&
      importedRows.length > 0 &&
      Boolean(categoryColumn) &&
      Boolean(valueColumn),
    getProps: ({ importedRows, categoryColumn, valueColumn }) => ({
      dataRows: importedRows,
      categoryColumn,
      valueColumn,
      defaultTitle: categoryColumn ? `${categoryColumn} Bar Chart` : "Bar Chart Preview"
    })
  },
  "dot-plot": {
    title: "Dot Plot Preview",
    Component: ScatterplotTool,
    isReady: ({ importedRows, xColumn, yColumn }) =>
      Array.isArray(importedRows) && importedRows.length > 0 && Boolean(xColumn) && Boolean(yColumn),
    getProps: ({ importedRows, xColumn, yColumn }) => ({
      dataRows: importedRows,
      xColumn,
      yColumn,
      defaultTitle: xColumn && yColumn ? `${xColumn} vs ${yColumn}` : "Dot Plot Preview"
    })
  },
  "histogram": {
    title: "Histogram Preview",
    Component: HistogramTool,
    isReady: ({ importedRows, valueColumn }) =>
      Array.isArray(importedRows) && importedRows.length > 0 && Boolean(valueColumn),
    getProps: ({ importedRows, valueColumn }) => ({
      dataRows: importedRows,
      valueColumn,
      defaultTitle: valueColumn ? `${valueColumn} Histogram` : "Histogram Preview"
    })
  },
  "density-plot": {
    title: "Density Plot Preview",
    Component: DensityTool,
    isReady: ({ importedRows, valueColumn }) =>
      Array.isArray(importedRows) && importedRows.length > 0 && Boolean(valueColumn),
    getProps: ({ importedRows, valueColumn }) => ({
      dataRows: importedRows,
      valueColumn,
      defaultTitle: valueColumn ? `${valueColumn} Density` : "Density Plot Preview"
    })
  },
  "pie-chart": {
    title: "Pie Chart Preview",
    Component: PieChartTool,
    isReady: ({ importedRows, categoryColumn, valueColumn }) =>
      Array.isArray(importedRows) &&
      importedRows.length > 0 &&
      Boolean(categoryColumn) &&
      Boolean(valueColumn),
    getProps: ({ importedRows, categoryColumn, valueColumn }) => ({
      dataRows: importedRows,
      categoryColumn,
      valueColumn,
      defaultTitle: categoryColumn ? `${categoryColumn} Breakdown` : "Pie Chart Preview"
    })
  },
  "box-plot": {
    title: "Box Plot Preview",
    Component: BoxplotTool,
    isReady: ({ importedRows, valueColumn }) =>
      Array.isArray(importedRows) && importedRows.length > 0 && Boolean(valueColumn),
    getProps: ({ importedRows, valueColumn, categoryColumn }) => ({
      dataRows: importedRows,
      valueColumn,
      groupColumn: categoryColumn || "",
      defaultTitle: valueColumn ? `${valueColumn} Boxplot` : "Box Plot Preview"
    })
  }
};
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
  "box-plot": "BoxPlot",
  "iqr": "IQR",
  "standard-deviation": "StandardDeviation",
  "median": "Median",
  "read-csv": "ReadCSV",
  "combinations": "Combinations",
  "permutations": "Permutations",
  "anova": "ANOVA",
  "z-value": "ZValue",
  "t-test": "TTest"
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
  BoxPlot: "box-plot",
  IQR: "iqr",
  StandardDeviation: "standard-deviation",
  Median: "median",
  ReadCSV: "read-csv",
  Combinations: "combinations",
  Permutations: "permutations",
  ANOVA: "anova",
  ZValue: "z-value",
  TTest: "t-test"
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
export default function RDashboard() {
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
  // State for custom arguments - must be declared before useMemo that uses it
  const [customArguments, setCustomArguments] = useState({});

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
    generatedRCode: baseGeneratedRCode,
    generatedArguments,
    availableColumns,
    validation,
    handleToolChange,
    applyImportedRows,
    updateDataValue,
    updateColumnSelection,
    toggleRightPanel
  } = useRDashboard({
    initialRows: resolvedImportedRows,
    initialTool: resolvedSelectedTool,
    projectVersion
  });

  // Helper function to generate R code for one-function tools
  const generateOneFunctionToolCode = useCallback((toolId, args, currentToolArg) => {
    // If no custom arguments provided, just return the default code
    if (!args || Object.keys(args).length === 0) {
      return RCodeService.getDefaultCode(toolId);
    }
    
    const defaultArgs = currentToolArg?.arguments || [];
    
    // Get values from customArguments or fall back to default values
    const getValue = (argName) => {
      return args[argName] !== undefined ? args[argName] : 
             defaultArgs.find(a => a.name === argName)?.value || '';
    };
    
    switch (toolId) {
      case 'iqr':
      case 'standard-deviation':
      case 'median': {
        const values = getValue('Values');
        const naRm = getValue('na.rm');
        const funcName = toolId === 'iqr' ? 'IQR' : toolId === 'standard-deviation' ? 'sd' : 'median';
        const resultName = toolId === 'iqr' ? 'Interquartile Range' : toolId === 'standard-deviation' ? 'Standard Deviation' : 'Median';
        return `# Initialize data
values <- c(${values})

# Calculate ${resultName.toLowerCase()}
result <- ${funcName}(values, na.rm = ${naRm})

# Print result
print(paste("${resultName}:", result))`;
      }
      case 'read-csv': {
        const fileName = getValue('File Name');
        const header = getValue('header');
        const sep = getValue('sep');
        const stringsAsFactors = getValue('stringsAsFactors');
        return `# Read CSV file
data <- read.csv(
  file = "${fileName}",
  header = ${header},
  sep = "${sep}",
  quote = "\\"",
  dec = ".",
  fill = TRUE,
  comment.char = "",
  stringsAsFactors = ${stringsAsFactors}
)

# Display first few rows
head(data)

# Display structure
str(data)`;
      }
      case 'combinations': {
        const n = getValue('n (total items)');
        const k = getValue('k (items to choose)');
        return `# Calculate combinations: choose(n, k)
# n: total number of items
# k: number of items to choose

n <- ${n}
k <- ${k}

# Calculate combinations
combinations <- choose(n, k)

# Print result
print(paste("Number of ways to choose", k, "items from", n, "items:", combinations))`;
      }
      case 'permutations': {
        const n = getValue('n (total items)');
        const k = getValue('k (items to arrange)');
        return `# Calculate permutations
# n: total number of items
# k: number of items to arrange

n <- ${n}
k <- ${k}

# Calculate permutations using factorial
permutations <- factorial(n) / factorial(n - k)

# Print result
print(paste("Number of permutations of", k, "items from", n, "items:", permutations))`;
      }
      case 'z-value': {
        const sampleMean = getValue('Sample Mean');
        const populationMean = getValue('Population Mean');
        const standardDeviation = getValue('Standard Deviation');
        const sampleSize = getValue('Sample Size');
        return `# Calculate Z-value
sample_mean <- ${sampleMean}
population_mean <- ${populationMean}
standard_deviation <- ${standardDeviation}
sample_size <- ${sampleSize}

# Calculate standard error
standard_error <- standard_deviation / sqrt(sample_size)

# Calculate Z-value
z_value <- (sample_mean - population_mean) / standard_error

# Print result
print(paste("Z-value:", z_value))

# Calculate p-value (two-tailed)
p_value <- 2 * pnorm(-abs(z_value))
print(paste("P-value (two-tailed):", p_value))`;
      }
      case 't-test': {
        const group1 = getValue('Group 1 Values');
        const group2 = getValue('Group 2 Values');
        const paired = getValue('Paired');
        return `# Initialize data
group1 <- c(${group1})
group2 <- c(${group2})

# Perform t-test
t_test_result <- t.test(
  group1, 
  group2,
  paired = ${paired},
  var.equal = FALSE
)

# Print results
print(t_test_result)

# Extract specific values
print(paste("T-statistic:", t_test_result$statistic))
print(paste("P-value:", t_test_result$p.value))
print(paste("Degrees of freedom:", t_test_result$parameter))`;
      }
      default:
        return RCodeService.getDefaultCode(toolId);
    }
  }, []);

  // Generate R code with custom arguments if available
  const generatedRCode = useMemo(() => {
    // For one-function tools, generate code with custom arguments
    const oneFunctionTools = ['iqr', 'standard-deviation', 'median', 'read-csv', 'combinations', 'permutations', 'z-value', 't-test'];
    const isOneFunction = oneFunctionTools.includes(selectedTool);
    
    if (isOneFunction) {
      // Generate custom code for one-function tools (even if no customArguments yet)
      // Note: toolConfig will be passed from the component state later via currentTool
      return generateOneFunctionToolCode(selectedTool, customArguments, null);
    }
    
    // Always try to apply custom arguments if any exist for visualization tools
    const hasCustomArgs = Object.keys(customArguments).length > 0;
    
    if (!hasCustomArgs) {
      return baseGeneratedRCode;
    }
    
    // Apply custom arguments to the R code
    const customCode = RCodeService.generateCodeWithCustomArguments(
      selectedTool,
      importedRows,
      { responseColumn, predictorColumns, categoryColumn, valueColumn, timeColumn, xColumn, yColumn },
      customArguments
    );
    
    return customCode;
  }, [baseGeneratedRCode, customArguments, selectedTool, importedRows, responseColumn, predictorColumns, categoryColumn, valueColumn, timeColumn, xColumn, yColumn, generateOneFunctionToolCode]);

  // Tracks the most recent project/tool combo we wrote so we can avoid redundant storage churn.
  const lastPersistedToolRef = useRef({ projectId: null, toolId: null });
  const copyToastTimerRef = useRef(null);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState('');
  const [copyToastTone, setCopyToastTone] = useState('success');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [appearanceStyle, setAppearanceStyle] = useState(0);
  const [infoTooltipVisible, setInfoTooltipVisible] = useState(null);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [codeViewMode, setCodeViewMode] = useState('night'); // 'dark', 'light', or 'night'
  const previewConfig = TOOL_PREVIEW_COMPONENTS[selectedTool] || null;
  const previewContext = useMemo(
    () => ({
      importedRows,
      selectedTool,
      xColumn,
      yColumn,
      valueColumn,
      categoryColumn,
      responseColumn,
      predictorColumns
    }),
    [importedRows, selectedTool, xColumn, yColumn, valueColumn, categoryColumn, responseColumn, predictorColumns]
  );
  const previewAvailable = Boolean(
    previewConfig &&
      (typeof previewConfig.isReady === 'function'
        ? previewConfig.isReady(previewContext)
        : true)
  );
  const previewProps =
    typeof previewConfig?.getProps === 'function'
      ? previewConfig.getProps(previewContext)
      : {};

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

  const openPreviewModal = useCallback(() => {
    if (previewAvailable) {
      setPreviewModalOpen(true);
    }
  }, [previewAvailable]);

  const closePreviewModal = useCallback(() => {
    setPreviewModalOpen(false);
  }, []);

  useEffect(() => {
    if ((!previewConfig || !previewAvailable) && previewModalOpen) {
      setPreviewModalOpen(false);
    }
  }, [previewModalOpen, previewConfig, previewAvailable]);

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
      // Reset custom arguments when switching tools
      setCustomArguments({});
    },
    [handleToolChange, persistSelectedTool]
  );

  // Once data is loaded, keep storage in sync with the current tool.
  const handleArgumentChange = useCallback((argName, newValue) => {
    setCustomArguments(prev => {
      const updated = {
        ...prev,
        [argName]: newValue
      };
      console.log('Argument changed:', argName, '=', newValue);
      console.log('All custom arguments:', updated);
      return updated;
    });
  }, []);

  const handleColorChange = useCallback((argName, color) => {
    setCustomArguments(prev => ({
      ...prev,
      [argName]: color
    }));
  }, []);

  // Helper to convert color name to hex for color picker
  const getColorHex = useCallback((colorValue) => {
    if (!colorValue) return '#4a9eff';
    // If it's already a hex color, return it
    if (colorValue.match(/^#[0-9A-Fa-f]{6}$/)) {
      return colorValue;
    }
    // Try to convert color name to hex
    const colorMap = {
      'blue': '#0000ff',
      'red': '#ff0000',
      'green': '#008000',
      'yellow': '#ffff00',
      'orange': '#ffa500',
      'purple': '#800080',
      'pink': '#ffc0cb',
      'black': '#000000',
      'white': '#ffffff',
      'darkgreen': '#006400',
      'lightblue': '#add8e6',
      'lightgreen': '#90ee90',
      'darkblue': '#00008b',
    };
    const lowerColor = colorValue.toLowerCase().trim();
    return colorMap[lowerColor] || '#4a9eff';
  }, []);

  const toggleAppearanceStyle = useCallback(() => {
    setAppearanceStyle(prev => (prev + 1) % 4);
  }, []);

  const isDatasetArgument = useCallback((argName) => {
    // Check if argument is dataset-related (like X1, X2, Y, Categories, Values, Time Points, etc.)
    const datasetKeywords = ['x1', 'x2', 'y', 'categories', 'values', 'time points', 'x values', 'y values', 'formula'];
    const lowerName = argName.toLowerCase();
    return datasetKeywords.some(keyword => lowerName.includes(keyword)) || 
           argName.includes(':') || // Data inputs like "y:", "x1:"
           argName.toLowerCase().includes('initialize data');
  }, []);

  const isColorArgument = useCallback((argName) => {
    const colorKeywords = ['color', 'colour', 'line color', 'point color', 'border color', 'title color', 'colors'];
    const lowerName = argName.toLowerCase();
    return colorKeywords.some(keyword => lowerName.includes(keyword));
  }, []);

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
      case 'histogram':
        return valueColumn;
      case 'density-plot':
        return valueColumn;
      case 'box-plot':
        return valueColumn;
      case 'anova':
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
      case 'histogram':
        return `Generated R code for histogram using ${valueColumn} as the data variable.`;
      case 'density-plot':
        return `Generated R code for density plot using ${valueColumn} as the data variable.`;
      case 'box-plot':
        return `Generated R code for box plot using ${valueColumn} as the data variable.`;
      case 'anova':
        return `Generated R code for ANOVA model using ${categoryColumn} as groups and ${valueColumn} as values.`;
      default:
        return 'Generated R code based on your data and selections.';
    }
  }

  const tools = [
    {
      id: "linear-regression",
      name: "Linear Regression",
      description: "A model that estimates the relationship between a scalar response.",
      icon: "/images/tools/linear.png",
      color: "#ff4444",
      chartIcon: "/images/tools/linear.png",
      useImage: true,
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
        { name: "Formula", value: "y ~ x1 + x2", readOnly: false },
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
      icon: "/images/tools/bar.png",
      color: "#4444ff",
      chartIcon: "/images/tools/bar.png",
      useImage: true,
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
      icon: "/images/tools/line.png",
      color: "#44ffaa",
      chartIcon: "/images/tools/line.png",
      useImage: true,
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
      icon: "/images/tools/dot.png",
      color: "#6f42c1",
      chartIcon: "/images/tools/dot.png",
      useImage: true,
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
      icon: "/images/tools/pie.png",
      color: "#ff6b35",
      chartIcon: "/images/tools/pie.png",
      useImage: true,
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
      icon: "/images/tools/histogram.png",
      color: "#8e44ad",
      chartIcon: "/images/tools/histogram.png",
      useImage: true,
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
      icon: "/images/tools/density.png",
      color: "#27ae60",
      chartIcon: "/images/tools/density.png",
      useImage: true,
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
      icon: "/images/tools/box.png",
      color: "#e67e22",
      chartIcon: "/images/tools/box.png",
      useImage: true,
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
    },
    {
      id: "iqr",
      name: "IQR (Interquartile Range)",
      description: "Calculate the interquartile range of a dataset.",
      icon: "📐",
      color: "#3498db",
      chartIcon: "📐",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Calculate IQR
iqr_value <- IQR(values, na.rm = TRUE)

# Print result
print(paste("Interquartile Range:", iqr_value))`,
      codeDescription: "Calculates the interquartile range (IQR) of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "na.rm", value: "TRUE", readOnly: false }
      ]
    },
    {
      id: "standard-deviation",
      name: "Standard Deviation (sd)",
      description: "Calculate the standard deviation of a dataset.",
      icon: "📊",
      color: "#9b59b6",
      chartIcon: "📊",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Calculate standard deviation
sd_value <- sd(values, na.rm = TRUE)

# Print result
print(paste("Standard Deviation:", sd_value))`,
      codeDescription: "Calculates the standard deviation of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "na.rm", value: "TRUE", readOnly: false }
      ]
    },
    {
      id: "median",
      name: "Median",
      description: "Calculate the median value of a dataset.",
      icon: "📏",
      color: "#16a085",
      chartIcon: "📏",
      rCode: `# Initialize data
values <- c(12, 15, 18, 22, 25, 23, 28, 32, 30, 35, 18, 22, 25, 28, 30)

# Calculate median
median_value <- median(values, na.rm = TRUE)

# Print result
print(paste("Median:", median_value))`,
      codeDescription: "Calculates the median of numeric values.",
      sampleData: [
        { value: 12 },
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 25 }
      ],
      arguments: [
        { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
        { name: "na.rm", value: "TRUE", readOnly: false }
      ]
    },
    {
      id: "read-csv",
      name: "Read CSV",
      description: "Import data from a CSV file into R.",
      icon: "📂",
      color: "#e74c3c",
      chartIcon: "📂",
      rCode: `# Read CSV file
data <- read.csv(
  file = "data.csv",
  header = TRUE,
  sep = ",",
  quote = "\\"",
  dec = ".",
  fill = TRUE,
  comment.char = "",
  stringsAsFactors = FALSE
)

# Display first few rows
head(data)

# Display structure
str(data)`,
      codeDescription: "Reads data from a CSV file with customizable parameters.",
      sampleData: [
        { column1: "value1", column2: "value2" },
        { column1: "value3", column2: "value4" }
      ],
      arguments: [
        { name: "File Name", value: "data.csv", readOnly: false },
        { name: "header", value: "TRUE", readOnly: false },
        { name: "sep", value: ",", readOnly: false },
        { name: "stringsAsFactors", value: "FALSE", readOnly: false }
      ]
    },
    {
      id: "combinations",
      name: "Combinations",
      description: "Calculate the number of ways to choose k items from n items.",
      icon: "🔢",
      color: "#f39c12",
      chartIcon: "🔢",
      rCode: `# Calculate combinations: choose(n, k)
# n: total number of items
# k: number of items to choose

n <- 10
k <- 3

# Calculate combinations
combinations <- choose(n, k)

# Print result
print(paste("Number of ways to choose", k, "items from", n, "items:", combinations))`,
      codeDescription: "Calculates the number of combinations using the choose(n, k) function.",
      sampleData: [
        { n: 10, k: 3, result: 120 }
      ],
      arguments: [
        { name: "n (total items)", value: "10", readOnly: false },
        { name: "k (items to choose)", value: "3", readOnly: false }
      ]
    },
    {
      id: "permutations",
      name: "Permutations",
      description: "Calculate the number of permutations (arrangements) of items.",
      icon: "🔀",
      color: "#1abc9c",
      chartIcon: "🔀",
      rCode: `# Calculate permutations
# n: total number of items
# k: number of items to arrange

n <- 10
k <- 3

# Calculate permutations using factorial
permutations <- factorial(n) / factorial(n - k)

# Print result
print(paste("Number of permutations of", k, "items from", n, "items:", permutations))`,
      codeDescription: "Calculates the number of permutations using factorial functions.",
      sampleData: [
        { n: 10, k: 3, result: 720 }
      ],
      arguments: [
        { name: "n (total items)", value: "10", readOnly: false },
        { name: "k (items to arrange)", value: "3", readOnly: false }
      ]
    },
    {
      id: "anova",
      name: "ANOVA Model",
      description: "Perform Analysis of Variance to compare means across groups.",
      icon: "📈",
      color: "#d35400",
      chartIcon: "📈",
      rCode: `# Initialize data
df <- data.frame(
  value = c(23, 25, 27, 29, 31, 30, 32, 34, 36, 38, 18, 20, 22, 24, 26),
  group = factor(c(rep("Group1", 5), rep("Group2", 5), rep("Group3", 5)))
)

# Fit ANOVA model
anova_model <- aov(value ~ group, data = df)

# Display summary
summary(anova_model)

# Post-hoc test (Tukey's HSD)
TukeyHSD(anova_model)`,
      codeDescription: "Performs one-way ANOVA to test differences between group means.",
      sampleData: [
        { group: "Group1", value: 23 },
        { group: "Group1", value: 25 },
        { group: "Group1", value: 27 },
        { group: "Group2", value: 30 },
        { group: "Group2", value: 32 },
        { group: "Group2", value: 34 },
        { group: "Group3", value: 18 },
        { group: "Group3", value: 20 },
        { group: "Group3", value: 22 }
      ],
      arguments: [
        { name: "Formula", value: "value ~ group", readOnly: false }
      ]
    },
    {
      id: "z-value",
      name: "Z-Value",
      description: "Calculate the Z-value and p-value for hypothesis testing.",
      icon: "📐",
      color: "#2980b9",
      chartIcon: "📐",
      rCode: `# Calculate Z-value
sample_mean <- 52
population_mean <- 50
standard_deviation <- 5
sample_size <- 30

# Calculate standard error
standard_error <- standard_deviation / sqrt(sample_size)

# Calculate Z-value
z_value <- (sample_mean - population_mean) / standard_error

# Print result
print(paste("Z-value:", z_value))

# Calculate p-value (two-tailed)
p_value <- 2 * pnorm(-abs(z_value))
print(paste("P-value (two-tailed):", p_value))`,
      codeDescription: "Calculates Z-value for hypothesis testing with known population parameters.",
      sampleData: [
        { sampleMean: 52, populationMean: 50, sd: 5, n: 30 }
      ],
      arguments: [
        { name: "Sample Mean", value: "52", readOnly: false },
        { name: "Population Mean", value: "50", readOnly: false },
        { name: "Standard Deviation", value: "5", readOnly: false },
        { name: "Sample Size", value: "30", readOnly: false }
      ]
    },
    {
      id: "t-test",
      name: "T-Test",
      description: "Perform independent or paired t-test to compare two groups.",
      icon: "📊",
      color: "#8e44ad",
      chartIcon: "📊",
      rCode: `# Initialize data
group1 <- c(23, 25, 27, 29, 31, 33, 35)
group2 <- c(18, 20, 22, 24, 26, 28, 30)

# Perform t-test
t_test_result <- t.test(
  group1, 
  group2,
  paired = FALSE,
  var.equal = FALSE
)

# Print results
print(t_test_result)

# Extract specific values
print(paste("T-statistic:", t_test_result$statistic))
print(paste("P-value:", t_test_result$p.value))
print(paste("Degrees of freedom:", t_test_result$parameter))`,
      codeDescription: "Performs t-test to compare means of two independent or paired groups.",
      sampleData: [
        { group1: "23, 25, 27", group2: "18, 20, 22" }
      ],
      arguments: [
        { name: "Group 1 Values", value: "23, 25, 27, 29, 31, 33, 35", readOnly: false },
        { name: "Group 2 Values", value: "18, 20, 22, 24, 26, 28, 30", readOnly: false },
        { name: "Paired", value: "FALSE", readOnly: false }
      ]
    }
  ];

  // Get current tool configuration
  const currentTool = tools.find(tool => tool.id === selectedTool);
  const currentProjectName = currentProject?.name || (projectHydrated ? "Untitled Project" : "");

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!toolSearchQuery.trim()) {
      return tools;
    }
    const query = toolSearchQuery.toLowerCase();
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.id.toLowerCase().includes(query)
    );
  }, [toolSearchQuery, tools]);

  // Determine if current tool is a one-function tool (doesn't need data table)
  const isOneFunctionTool = useMemo(() => {
    const oneFunctionTools = ['iqr', 'standard-deviation', 'median', 'read-csv', 'combinations', 'permutations', 'z-value', 't-test'];
    return oneFunctionTools.includes(selectedTool);
  }, [selectedTool]);
  const PreviewComponent = previewConfig?.Component;

  return (
    <>
      <Head>
        <title>R Tools Dashboard</title>
        <meta name="description" content="R programming language tools dashboard for data analysis and statistics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {previewModalOpen && previewConfig && (
        <div
          className={styles.previewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={previewConfig.title}
        >
          <div className={styles.previewModal}>
            <div className={styles.previewModalHeader}>
              <h2>{previewConfig.title}</h2>
              <button
                type="button"
                className={styles.previewCloseButton}
                onClick={closePreviewModal}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className={styles.previewModalBody}>
              {PreviewComponent && <PreviewComponent {...previewProps} />}
            </div>
          </div>
        </div>
      )}

      <Header
        onImportClick={handleTriggerImport}
        onEditClick={toggleRightPanel}
        onExportClick={handleExport}
        onProjectRename={handleProjectRename}
        onPreviewClick={openPreviewModal}
        isPreviewAvailable={previewAvailable}
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
              <h2>Add R Tool</h2>
              <p>Select an RStudio tool from the list.</p>
            </div>
            
            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="🔍  Search R tools..."
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
              />
              {toolSearchQuery && (
                <button
                  className={styles.clearSearchBtn}
                  onClick={() => setToolSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Display count of filtered tools */}
            {toolSearchQuery && (
              <div className={styles.searchResults}>
                Found {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''}
              </div>
            )}
            
            <div className={styles.toolList}>
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`${styles.toolCard} ${selectedTool === tool.id ? styles.selected : ''}`}
                  onClick={() => handleToolSelection(tool.id)}
                >
                <div className={styles.toolCardVisual}>
                  <div className={styles.toolVisualization} style={{ color: tool.color }}>
                    {tool.useImage ? (
                      <img src={tool.chartIcon} alt={tool.name} style={{ width: '50%', height: '35%', objectFit: 'contain', marginLeft: '25%', marginTop: '-16px', marginBottom: '-46px' }} />
                    ) : (
                      tool.chartIcon
                    )}
                  </div>
                </div>
                  <div className={styles.toolCardContent}>
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
              
            </div>

            {/* Data Table / Placeholder or Argument Inputs for One-Function Tools */}
            {isOneFunctionTool ? (
              <div className={styles.oneFunctionToolInputs}>
                <h3>Configure Tool Arguments</h3>
                <p className={styles.toolInstructions}>
                  Enter values for each argument below. The R code will update automatically.
                </p>
                {currentTool?.arguments.map((arg, index) => (
                  <div key={index} className={styles.argumentInput}>
                    <label>{arg.name}</label>
                    <input
                      type="text"
                      value={customArguments[arg.name] ?? arg.value}
                      onChange={(e) => handleArgumentChange(arg.name, e.target.value)}
                      placeholder={arg.value}
                    />
                  </div>
                ))}
              </div>
            ) : (
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
            )}

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
                <h4>Column Selection</h4>
                {selectedTool === 'linear-regression' && (
                  <>
                    <p><strong>Response Variable:</strong> {responseColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Predictor Variables:</strong> {predictorColumns.length > 0 ? predictorColumns.join(', ') : <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'bar-chart' && (
                  <>
                    <p><strong>Category Column:</strong> {categoryColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'line-chart' && (
                  <>
                    <p><strong>Time Column:</strong> {timeColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'dot-plot' && (
                  <>
                    <p><strong>X Column:</strong> {xColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Y Column:</strong> {yColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'pie-chart' && (
                  <>
                    <p><strong>Category Column:</strong> {categoryColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'histogram' && (
                  <>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'density-plot' && (
                  <>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'box-plot' && (
                  <>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                  </>
                )}
                {selectedTool === 'anova' && (
                  <>
                    <p><strong>Group Column:</strong> {categoryColumn || <span style={{color: '#888'}}>None selected</span>}</p>
                    <p><strong>Value Column:</strong> {valueColumn || <span style={{color: '#888'}}>None selected</span>}</p>
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
                <button 
                  className={styles.copyRCodeBtn}
                  onClick={handleCopyRCode}
                  title="Copy R Code"
                >
                  Copy R Code
                </button>
                <button 
                  className={styles.clearDatasetBtn}
                  onClick={() => {
                    applyImportedRows([], selectedTool);
                    persistImportedCsvData([]);
                  }}
                  title="Clear Dataset"
                >
                  Clear Dataset
                </button>
              </div>
            </div>

            <div className={styles.codeSection}>
              <div className={styles.sectionHeader}>
                <h3>Code Snippet</h3>
                <div className={styles.segmentedControl}>
                  <button 
                    className={`${styles.segmentedButton} ${codeViewMode === 'dark' ? styles.segmentedButtonActive : ''}`}
                    onClick={() => setCodeViewMode('dark')}
                  >
                    Dark
                  </button>
                  <button 
                    className={`${styles.segmentedButton} ${codeViewMode === 'light' ? styles.segmentedButtonActive : ''}`}
                    onClick={() => setCodeViewMode('light')}
                  >
                    Light
                  </button>
                  <button 
                    className={`${styles.segmentedButton} ${codeViewMode === 'night' ? styles.segmentedButtonActive : ''}`}
                    onClick={() => setCodeViewMode('night')}
                  >
                    Night
                  </button>
                </div>
              </div>
              <div className={`${styles.codeBlock} ${styles['codeBlock' + codeViewMode.charAt(0).toUpperCase() + codeViewMode.slice(1)]}`}>
                <RCodeHighlight code={generatedRCode} theme={codeViewMode} />
              </div>
              <p className={styles.codeDescription}>
                {importedRows.length > 0 && getCurrentSelectionsValid() 
                  ? getCodeDescription()
                  : `Default R code for ${selectedTool.replace('-', ' ')}. Import data and select variables to generate custom code.`
                }
              </p>
            </div>

            {!isOneFunctionTool && (
              <div className={styles.argumentsSection}>
                <h3>Arguments</h3>
                {generatedArguments?.map((arg, index) => {
                const isDataset = isDatasetArgument(arg.name);
                const isColor = isColorArgument(arg.name);
                const isReadOnly = arg.readOnly || isDataset;
                
                return (
                  <div key={index} className={`${styles.argumentGroup} ${isDataset ? styles.datasetArgument : ''}`}>
                    <div className={styles.argumentLabelRow}>
                      <label>{arg.name}</label>
                      {isDataset && (
                        <div className={styles.infoIconContainer}>
                          <span 
                            className={styles.infoIcon}
                            onMouseEnter={() => setInfoTooltipVisible(index)}
                            onMouseLeave={() => setInfoTooltipVisible(null)}
                          >
                            ℹ️
                          </span>
                          {infoTooltipVisible === index && (
                            <div className={styles.infoTooltip}>
                              Arguments for dataset can only be changed through the table or only through importing a new dataset.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {arg.type === "data" ? (
                      <div className={styles.dataInputs}>
                        {arg.data?.map((dataItem, dataIndex) => {
                          const dataItemKey = `${arg.name}_${dataItem.label}`;
                          const isDataItemDataset = isDatasetArgument(dataItem.label);
                          return (
                            <div key={dataIndex} className={`${styles.dataInput} ${isDataItemDataset ? styles.datasetInput : ''}`}>
                              <label>{dataItem.label}</label>
                              <div className={styles.dataInputWrapper}>
                                <input 
                                  type="text" 
                                  value={customArguments[dataItemKey] ?? dataItem.value}
                                  onChange={(e) => handleArgumentChange(dataItemKey, e.target.value)}
                                  disabled={isDataItemDataset}
                                  readOnly={isDataItemDataset}
                                />
                                {isDataItemDataset && (
                                  <div className={styles.infoIconContainer}>
                                    <span 
                                      className={styles.infoIcon}
                                      onMouseEnter={() => setInfoTooltipVisible(`${index}_${dataIndex}`)}
                                      onMouseLeave={() => setInfoTooltipVisible(null)}
                                    >
                                      ℹ️
                                    </span>
                                    {infoTooltipVisible === `${index}_${dataIndex}` && (
                                      <div className={styles.infoTooltip}>
                                        Arguments for dataset can only be changed through the table or only through importing a new dataset.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : isColor ? (
                      <div className={styles.colorInputWrapper}>
                        <input 
                          type="color" 
                          value={getColorHex(customArguments[arg.name] ?? arg.value)}
                          onChange={(e) => {
                            handleColorChange(arg.name, e.target.value);
                            handleArgumentChange(arg.name, e.target.value);
                          }}
                          className={styles.colorPicker}
                        />
                        <input 
                          type="text" 
                          value={customArguments[arg.name] ?? arg.value}
                          onChange={(e) => {
                            handleArgumentChange(arg.name, e.target.value);
                            // Try to update color picker if it's a valid hex
                            const hexMatch = e.target.value.match(/^#[0-9A-Fa-f]{6}$/);
                            if (hexMatch) {
                              handleColorChange(arg.name, e.target.value);
                            }
                          }}
                          className={styles.colorTextInput}
                          placeholder="Enter color name or hex"
                        />
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={customArguments[arg.name] ?? arg.value}
                        onChange={(e) => handleArgumentChange(arg.name, e.target.value)}
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            )}
            </div>
          )}
        </div>
        {/*Adds Accessibility Button to page */}
      <AccessibilityButton />
      {/*Adds Chat Option to the current page */}
      <CodexTool />
      </div>
    </>
  );
}
