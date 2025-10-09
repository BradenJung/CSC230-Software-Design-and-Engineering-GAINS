/**
 * EditableDataTable - Component for displaying and editing CSV data
 * Follows React best practices for component composition
 */

import { useState } from 'react';
import styles from '../styles/Home.module.css';

export const EditableDataTable = ({ 
  data, 
  onDataUpdate, 
  selectedTool,
  responseColumn, 
  predictorColumns,
  categoryColumn,
  valueColumn,
  timeColumn,
  xColumn,
  yColumn,
  onColumnSelectionChange 
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (!data || data.length === 0) {
    return (
      <div className={styles.tablePlaceholder}>
        <div className={styles.placeholderHeader}>
          <h3>Data table is empty</h3>
          <p>Import a CSV file to populate the table. Click Import above.</p>
        </div>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIllustration}>
            <div className={styles.placeholderGrid}>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.tableFormats}>
            <h4>Supported table formats</h4>
            <ul>
              <li>
                <strong>Tidy data</strong>: one row per observation; one column per variable; first row contains headers.
              </li>
              <li>
                <strong>Linear regression</strong>: numeric columns for predictors and one numeric response column (e.g., y, x1, x2, ...).
              </li>
              <li>
                <strong>Bar chart</strong>: category column and numeric value column (e.g., category, value).
              </li>
              <li>
                <strong>Line chart</strong>: time/index column and numeric value column (e.g., time, value).
              </li>
              <li>
                <strong>Dot plot / scatter</strong>: two numeric columns (e.g., x, y); optional category for groups.
              </li>
            </ul>
            <p>CSV must be UTF-8 encoded. Quoted cells and commas inside quotes are supported.</p>
          </div>
        </div>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});

  const handleCellClick = (rowIndex, columnName, currentValue) => {
    setEditingCell({ rowIndex, columnName });
    setEditValue(currentValue);
  };

  const handleCellSave = () => {
    if (editingCell) {
      onDataUpdate(editingCell.rowIndex, editingCell.columnName, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const handleColumnHeaderClick = (columnName) => {
    switch (selectedTool) {
      case 'linear-regression':
        if (responseColumn === columnName) {
          onColumnSelectionChange('response', null);
        } else if (predictorColumns.includes(columnName)) {
          onColumnSelectionChange('predictor', columnName, false);
        } else {
          onColumnSelectionChange('response', columnName);
        }
        break;
      case 'bar-chart':
        if (categoryColumn === columnName) {
          onColumnSelectionChange('category', null);
        } else if (valueColumn === columnName) {
          onColumnSelectionChange('value', null);
        } else {
          // Toggle between category and value
          if (!categoryColumn) {
            onColumnSelectionChange('category', columnName);
          } else if (!valueColumn) {
            onColumnSelectionChange('value', columnName);
          } else {
            // Replace category with new selection
            onColumnSelectionChange('category', columnName);
          }
        }
        break;
      case 'line-chart':
        if (timeColumn === columnName) {
          onColumnSelectionChange('time', null);
        } else if (valueColumn === columnName) {
          onColumnSelectionChange('value', null);
        } else {
          // Toggle between time and value
          if (!timeColumn) {
            onColumnSelectionChange('time', columnName);
          } else if (!valueColumn) {
            onColumnSelectionChange('value', columnName);
          } else {
            // Replace time with new selection
            onColumnSelectionChange('time', columnName);
          }
        }
        break;
      case 'dot-plot':
        if (xColumn === columnName) {
          onColumnSelectionChange('x', null);
        } else if (yColumn === columnName) {
          onColumnSelectionChange('y', null);
        } else {
          if (!xColumn) {
            onColumnSelectionChange('x', columnName);
          } else if (!yColumn) {
            onColumnSelectionChange('y', columnName);
          } else {
            onColumnSelectionChange('x', columnName);
          }
        }
        break;
    }
  };

  const getColumnHeaderClass = (columnName) => {
    let className = styles.columnHeader;
    
    switch (selectedTool) {
      case 'linear-regression':
        if (responseColumn === columnName) {
          className += ` ${styles.responseColumn}`;
        } else if (predictorColumns.includes(columnName)) {
          className += ` ${styles.predictorColumn}`;
        }
        break;
      case 'bar-chart':
        if (categoryColumn === columnName) {
          className += ` ${styles.categoryColumn}`;
        } else if (valueColumn === columnName) {
          className += ` ${styles.valueColumn}`;
        }
        break;
      case 'line-chart':
        if (timeColumn === columnName) {
          className += ` ${styles.timeColumn}`;
        } else if (valueColumn === columnName) {
          className += ` ${styles.valueColumn}`;
        }
        break;
      case 'dot-plot':
        if (xColumn === columnName) {
          className += ` ${styles.xColumn}`;
        } else if (yColumn === columnName) {
          className += ` ${styles.yColumn}`;
        }
        break;
    }
    
    return className;
  };

  return (
    <div className={styles.dataTable}>
      <table>
        <thead>
          <tr>
            {columns.map((columnName) => (
              <th 
                key={columnName} 
                className={getColumnHeaderClass(columnName)}
                onClick={() => handleColumnHeaderClick(columnName)}
                title={
                  selectedTool === 'linear-regression'
                    ? `Click to select as ${responseColumn === columnName ? 'response' : predictorColumns.includes(columnName) ? 'predictor' : 'response'} variable`
                    : selectedTool === 'bar-chart'
                      ? `Click to set ${!categoryColumn ? 'category' : !valueColumn ? 'value' : 'category'} column`
                      : selectedTool === 'line-chart'
                        ? `Click to set ${!timeColumn ? 'time' : !valueColumn ? 'value' : 'time'} column`
                        : selectedTool === 'dot-plot'
                          ? `Click to set ${!xColumn ? 'X' : !yColumn ? 'Y' : 'X'} column`
                          : ''
                }
              >
                <div className={styles.columnHeaderContent}>
                  <span>{String(columnName).toUpperCase()}</span>
                  {selectedTool === 'linear-regression' && responseColumn === columnName && (
                    <span className={styles.columnBadge}>Response</span>
                  )}
                  {selectedTool === 'linear-regression' && predictorColumns.includes(columnName) && (
                    <span className={styles.columnBadge}>Predictor</span>
                  )}
                  {selectedTool === 'bar-chart' && categoryColumn === columnName && (
                    <span className={styles.columnBadge}>Category</span>
                  )}
                  {selectedTool === 'bar-chart' && valueColumn === columnName && (
                    <span className={styles.columnBadge}>Value</span>
                  )}
                  {selectedTool === 'line-chart' && timeColumn === columnName && (
                    <span className={styles.columnBadge}>Time</span>
                  )}
                  {selectedTool === 'line-chart' && valueColumn === columnName && (
                    <span className={styles.columnBadge}>Value</span>
                  )}
                  {selectedTool === 'dot-plot' && xColumn === columnName && (
                    <span className={styles.columnBadge}>X</span>
                  )}
                  {selectedTool === 'dot-plot' && yColumn === columnName && (
                    <span className={styles.columnBadge}>Y</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((columnName, colIndex) => {
                const cellValue = String(row[columnName] || '');
                const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnName === columnName;
                
                return (
                  <td 
                    key={colIndex}
                    className={isEditing ? styles.editingCell : styles.editableCell}
                    onClick={() => !isEditing && handleCellClick(rowIndex, columnName, cellValue)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={handleKeyPress}
                        autoFocus
                        className={styles.cellInput}
                      />
                    ) : (
                      <span className={styles.cellValue}>{cellValue}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
