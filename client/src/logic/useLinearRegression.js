/**
 * Custom hook for managing linear regression state and logic
 * Follows React best practices for state management
 */

import { useState, useCallback, useMemo } from 'react';
import { RCodeService } from './RCodeService';

export const useLinearRegression = () => {
  const [selectedTool, setSelectedTool] = useState("linear-regression");
  const [importedRows, setImportedRows] = useState([]);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  
  // Tool-specific selections
  const [responseColumn, setResponseColumn] = useState('');
  const [predictorColumns, setPredictorColumns] = useState([]);
  const [categoryColumn, setCategoryColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [timeColumn, setTimeColumn] = useState('');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');

  // Parse CSV data when imported
  const handleFileImport = useCallback((csvText) => {
    const parsedData = RCodeService.parseCsv(csvText);
    setImportedRows(parsedData);
    
    // Auto-select columns based on current tool
    if (parsedData.length > 0) {
      const columns = RCodeService.getColumnNames(parsedData);
      if (columns.length >= 2) {
        switch (selectedTool) {
          case 'linear-regression':
            setResponseColumn(columns[0]);
            setPredictorColumns(columns.slice(1));
            break;
          case 'bar-chart':
            setCategoryColumn(columns[0]);
            setValueColumn(columns[1]);
            break;
          case 'line-chart':
            setTimeColumn(columns[0]);
            setValueColumn(columns[1]);
            break;
          case 'dot-plot':
            setXColumn(columns[0]);
            setYColumn(columns[1]);
            break;
        }
      }
    }
  }, [selectedTool]);

  // Handle tool switching
  const handleToolChange = useCallback((toolId) => {
    setSelectedTool(toolId);
    
    // Reset all column selections
    setResponseColumn('');
    setPredictorColumns([]);
    setCategoryColumn('');
    setValueColumn('');
    setTimeColumn('');
    setXColumn('');
    setYColumn('');
    
    // Auto-select columns for new tool if data is available
    if (importedRows.length > 0) {
      const columns = RCodeService.getColumnNames(importedRows);
      if (columns.length >= 2) {
        switch (toolId) {
          case 'linear-regression':
            setResponseColumn(columns[0]);
            setPredictorColumns(columns.slice(1));
            break;
          case 'bar-chart':
            setCategoryColumn(columns[0]);
            setValueColumn(columns[1]);
            break;
          case 'line-chart':
            setTimeColumn(columns[0]);
            setValueColumn(columns[1]);
            break;
          case 'dot-plot':
            setXColumn(columns[0]);
            setYColumn(columns[1]);
            break;
        }
      }
    }
  }, [importedRows]);

  // Update data value in the table
  const updateDataValue = useCallback((rowIndex, columnName, newValue) => {
    const updatedData = RCodeService.updateDataValue(importedRows, rowIndex, columnName, newValue);
    setImportedRows(updatedData);
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
      case 'dot-plot':
        if (type === 'x') {
          setXColumn(columnName);
        } else if (type === 'y') {
          setYColumn(columnName);
        }
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
      case 'dot-plot':
        return { xColumn, yColumn };
      default:
        return { responseColumn, predictorColumns };
    }
  }, [selectedTool, responseColumn, predictorColumns, categoryColumn, valueColumn, timeColumn, xColumn, yColumn]);

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
    xColumn,
    yColumn,
    isRightPanelVisible,
    
    // Computed values
    generatedRCode,
    generatedArguments,
    availableColumns,
    validation,
    
    // Actions
    handleToolChange,
    handleFileImport,
    updateDataValue,
    updateColumnSelection,
    toggleRightPanel
  };
};
