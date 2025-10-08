/**
 * Custom hook for managing linear regression state and logic
 * Follows React best practices for state management
 */

import { useState, useCallback, useMemo } from 'react';
import { RCodeService } from './RCodeService';

export const useLinearRegression = () => {
  const [selectedTool, setSelectedTool] = useState("linear-regression");
  const [importedRows, setImportedRows] = useState([]);
  const [responseColumn, setResponseColumn] = useState('');
  const [predictorColumns, setPredictorColumns] = useState([]);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  // Parse CSV data when imported
  const handleFileImport = useCallback((csvText) => {
    const parsedData = RCodeService.parseCsv(csvText);
    setImportedRows(parsedData);
    
    // Auto-select columns if data is available
    if (parsedData.length > 0) {
      const columns = RCodeService.getColumnNames(parsedData);
      if (columns.length >= 2) {
        setResponseColumn(columns[0]); // First column as response
        setPredictorColumns(columns.slice(1)); // Rest as predictors
      }
    }
  }, []);

  // Update data value in the table
  const updateDataValue = useCallback((rowIndex, columnName, newValue) => {
    const updatedData = RCodeService.updateDataValue(importedRows, rowIndex, columnName, newValue);
    setImportedRows(updatedData);
  }, [importedRows]);

  // Update response column selection
  const updateResponseColumn = useCallback((columnName) => {
    setResponseColumn(columnName);
    // Remove from predictors if it was there
    setPredictorColumns(prev => prev.filter(col => col !== columnName));
  }, []);

  // Update predictor columns selection
  const updatePredictorColumns = useCallback((columnName, isSelected) => {
    if (isSelected) {
      setPredictorColumns(prev => [...prev, columnName]);
    } else {
      setPredictorColumns(prev => prev.filter(col => col !== columnName));
    }
  }, []);

  // Toggle right panel visibility
  const toggleRightPanel = useCallback(() => {
    setIsRightPanelVisible(prev => !prev);
  }, []);

  // Generate R code based on current data and selections
  const generatedRCode = useMemo(() => {
    if (importedRows.length > 0 && responseColumn && predictorColumns.length > 0) {
      return RCodeService.generateLinearRegressionCode(
        importedRows, 
        responseColumn, 
        predictorColumns
      );
    }
    return RCodeService.getDefaultLinearRegressionCode();
  }, [importedRows, responseColumn, predictorColumns]);

  // Generate arguments based on current data and selections
  const generatedArguments = useMemo(() => {
    if (importedRows.length > 0 && responseColumn && predictorColumns.length > 0) {
      return RCodeService.generateArguments(
        importedRows, 
        responseColumn, 
        predictorColumns
      );
    }
    return RCodeService.getDefaultArguments();
  }, [importedRows, responseColumn, predictorColumns]);

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
    isRightPanelVisible,
    
    // Computed values
    generatedRCode,
    generatedArguments,
    availableColumns,
    validation,
    
    // Actions
    setSelectedTool,
    handleFileImport,
    updateDataValue,
    updateResponseColumn,
    updatePredictorColumns,
    toggleRightPanel
  };
};
