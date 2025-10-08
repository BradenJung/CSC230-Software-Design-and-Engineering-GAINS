/**
 * EditableDataTable - Component for displaying and editing CSV data
 * Follows React best practices for component composition
 */

import { useState } from 'react';
import styles from '../styles/Home.module.css';

export const EditableDataTable = ({ 
  data, 
  onDataUpdate, 
  responseColumn, 
  predictorColumns, 
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
    if (responseColumn === columnName) {
      // If it's currently the response column, deselect it
      onColumnSelectionChange('response', null);
    } else if (predictorColumns.includes(columnName)) {
      // If it's currently a predictor, remove it
      onColumnSelectionChange('predictor', columnName, false);
    } else {
      // If it's not selected, make it the response column
      onColumnSelectionChange('response', columnName);
    }
  };

  const getColumnHeaderClass = (columnName) => {
    let className = styles.columnHeader;
    if (responseColumn === columnName) {
      className += ` ${styles.responseColumn}`;
    } else if (predictorColumns.includes(columnName)) {
      className += ` ${styles.predictorColumn}`;
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
                title={`Click to select as ${responseColumn === columnName ? 'response' : predictorColumns.includes(columnName) ? 'predictor' : 'response'} variable`}
              >
                <div className={styles.columnHeaderContent}>
                  <span>{String(columnName).toUpperCase()}</span>
                  {responseColumn === columnName && (
                    <span className={styles.columnBadge}>Response</span>
                  )}
                  {predictorColumns.includes(columnName) && (
                    <span className={styles.columnBadge}>Predictor</span>
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
