import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RCodeService } from './RCodeService';

export const useLinearRegression = ({
  initialRows = [],
  initialTool = 'linear-regression',
  projectVersion
} = {}) => {
  const [selectedTool, setSelectedTool] = useState(initialTool || 'linear-regression');
  const [importedRows, setImportedRows] = useState(Array.isArray(initialRows) ? initialRows : []);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  // Tool-specific selections
  const [responseColumn, setResponseColumn] = useState('');
  const [predictorColumns, setPredictorColumns] = useState([]);
  const [categoryColumn, setCategoryColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [timeColumn, setTimeColumn] = useState('');

  // Reset dependent selections whenever the table rows or active tool change.
  const autoSelectColumns = useCallback((rows, tool = selectedTool) => {
    if (!rows || rows.length === 0) {
      setResponseColumn('');
      setPredictorColumns([]);
      setCategoryColumn('');
      setValueColumn('');
      setTimeColumn('');
      return;
    }

    const columns = RCodeService.getColumnNames(rows);
    if (!columns.length) {
      return;
    }

    switch (tool) {
      case 'linear-regression': {
        setResponseColumn(columns[0] ?? '');
        setPredictorColumns(columns.slice(1));
        break;
      }
      case 'bar-chart': {
        setCategoryColumn(columns[0] ?? '');
        setValueColumn(columns[1] ?? '');
        break;
      }
      case 'line-chart': {
        setTimeColumn(columns[0] ?? '');
        setValueColumn(columns[1] ?? '');
        break;
      }
      default:
        break;
    }
  }, [selectedTool]);

  // Centralized helper so every entry point (snapshot load, CSV import, edits) keeps tool + rows in sync.
  const applyImportedRows = useCallback((rows, tool = selectedTool) => {
    const normalizedRows = Array.isArray(rows) ? rows : [];
    setImportedRows(normalizedRows);
    autoSelectColumns(normalizedRows, tool);
  }, [autoSelectColumns, selectedTool]);

  const handleFileImport = useCallback((csvText) => {
    const parsedData = RCodeService.parseCsv(csvText);
    applyImportedRows(parsedData);
  }, [applyImportedRows]);

  // Allows the parent page to rehydrate the hook whenever a different project is opened.
  const initializeFromSnapshot = useCallback(({ rows, tool } = {}) => {
    const nextTool = tool || 'linear-regression';
    setSelectedTool(nextTool);
    applyImportedRows(rows ?? [], nextTool);
  }, [applyImportedRows]);

  const lastHydratedRef = useRef({
    projectVersion: null,
    tool: null,
    rowsSignature: null
  });

  // Only rehydrate when the upstream project payload actually changes, avoiding feedback loops.
  useEffect(() => {
    const nextVersion = projectVersion ?? null;
    const targetRows = Array.isArray(initialRows) ? initialRows : [];
    const rowsSignature = JSON.stringify(targetRows);
    const nextTool = initialTool || 'linear-regression';
    const last = lastHydratedRef.current;

    if (
      nextVersion !== null &&
      (last.projectVersion !== nextVersion ||
        last.rowsSignature !== rowsSignature ||
        last.tool !== nextTool)
    ) {
      initializeFromSnapshot({ rows: targetRows, tool: nextTool });
      lastHydratedRef.current = {
        projectVersion: nextVersion,
        rowsSignature,
        tool: nextTool
      };
    }
  }, [initialRows, initialTool, projectVersion, initializeFromSnapshot]);

  // Handle tool switching
  const handleToolChange = useCallback((toolId) => {
    setSelectedTool(toolId);

    // Reset all column selections
    setResponseColumn('');
    setPredictorColumns([]);
    setCategoryColumn('');
    setValueColumn('');
    setTimeColumn('');

    // Auto-select columns for new tool if data is available
    if (importedRows.length > 0) {
      autoSelectColumns(importedRows, toolId);
    }
  }, [autoSelectColumns, importedRows]);

  // Update data value in the table
  const updateDataValue = useCallback((rowIndex, columnName, newValue) => {
    const updatedData = RCodeService.updateDataValue(importedRows, rowIndex, columnName, newValue);
    setImportedRows(updatedData);
    return updatedData;
  }, [importedRows]);

  // Update column selections based on tool type
  const updateColumnSelection = useCallback((type, columnName, isSelected = true) => {
    switch (selectedTool) {
      case 'linear-regression':
        if (type === 'response') {
          setResponseColumn(columnName);
          setPredictorColumns(prev => prev.filter(col => col !== columnName));
        } else if (type === 'predictor') {
          if (isSelected) {
            setPredictorColumns(prev => [...prev, columnName]);
          } else {
            setPredictorColumns(prev => prev.filter(col => col !== columnName));
          }
        }
        break;
      case 'bar-chart':
        if (type === 'category') {
          setCategoryColumn(columnName);
        } else if (type === 'value') {
          setValueColumn(columnName);
        }
        break;
      case 'line-chart':
        if (type === 'time') {
          setTimeColumn(columnName);
        } else if (type === 'value') {
          setValueColumn(columnName);
        }
        break;
      default:
        break;
    }
  }, [selectedTool]);

  // Get current selections based on tool type
  const getCurrentSelections = useCallback(() => {
    switch (selectedTool) {
      case 'linear-regression':
        return { responseColumn, predictorColumns };
      case 'bar-chart':
        return { categoryColumn, valueColumn };
      case 'line-chart':
        return { timeColumn, valueColumn };
      default:
        return { responseColumn, predictorColumns };
    }
  }, [selectedTool, responseColumn, predictorColumns, categoryColumn, valueColumn, timeColumn]);

  // Toggle right panel visibility
  const toggleRightPanel = useCallback(() => {
    setIsRightPanelVisible(prev => !prev);
  }, []);

  // Generate R code based on current tool and data
  const generatedRCode = useMemo(() => {
    const selections = getCurrentSelections();
    return RCodeService.generateCode(selectedTool, importedRows, selections);
  }, [selectedTool, importedRows, getCurrentSelections]);

  // Generate arguments based on current tool and data
  const generatedArguments = useMemo(() => {
    const selections = getCurrentSelections();
    return RCodeService.generateArguments(selectedTool, importedRows, selections);
  }, [selectedTool, importedRows, getCurrentSelections]);

  // Get available columns
  const availableColumns = useMemo(() => {
    return RCodeService.getColumnNames(importedRows);
  }, [importedRows]);

  // Validate current data
  const validation = useMemo(() => {
    return RCodeService.validateDataForLinearRegression(importedRows);
  }, [importedRows]);

  return {
    // State
    selectedTool,
    importedRows,
    responseColumn,
    predictorColumns,
    categoryColumn,
    valueColumn,
    timeColumn,
    isRightPanelVisible,

    // Computed values
    generatedRCode,
    generatedArguments,
    availableColumns,
    validation,

    // Actions
    handleToolChange,
    handleFileImport,
    applyImportedRows,
    updateDataValue,
    updateColumnSelection,
    toggleRightPanel,
    initializeFromSnapshot
  };
};
