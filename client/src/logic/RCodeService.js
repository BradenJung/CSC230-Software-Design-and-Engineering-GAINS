/**
 * RCodeService - Business logic for R code generation and data processing
 * Follows Next.js best practices for service layer architecture
 */

export class RCodeService {
  /**
   * Parse CSV text into structured data
   * @param {string} text - Raw CSV text
   * @returns {Array<Object>} Parsed data as array of objects
   */
  static parseCsv(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (current.length > 0 || row.length > 0) {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = '';
        }
        // Handle \r\n pairs
        if (char === '\r' && next === '\n') i++;
      } else {
        current += char;
      }
    }
    
    if (current.length > 0 || row.length > 0) {
      row.push(current.trim());
      rows.push(row);
    }
    
    // Clean up empty rows
    const cleaned = rows.filter(r => r.some(c => c !== ''));
    if (cleaned.length === 0) return [];
    
    // Generate headers and convert to objects
    const headers = cleaned[0].map(h => (h || `col_${Math.random().toString(36).slice(2, 6)}`));
    const data = cleaned.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ?? '';
      });
      return obj;
    });
    
    return data;
  }

  /**
   * Generate R code for linear regression based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} responseColumn - Name of the response variable column
   * @param {Array<string>} predictorColumns - Names of predictor variable columns
   * @returns {string} Generated R code
   */
  static generateLinearRegressionCode(data, responseColumn, predictorColumns) {
    if (!data || data.length === 0) {
      return this.getDefaultLinearRegressionCode();
    }

    // Extract data values for each column
    const responseValues = data.map(row => row[responseColumn]).filter(val => val !== '');
    const predictorData = {};
    
    predictorColumns.forEach(col => {
      predictorData[col] = data.map(row => row[col]).filter(val => val !== '');
    });

    // Generate data frame initialization
    const dataFrameLines = [];
    dataFrameLines.push('df <- data.frame(');
    
    // Add response variable
    dataFrameLines.push(`  ${responseColumn} = c(${responseValues.join(', ')}),`);
    
    // Add predictor variables
    predictorColumns.forEach((col, index) => {
      const values = predictorData[col];
      const comma = index === predictorColumns.length - 1 ? '' : ',';
      dataFrameLines.push(`  ${col} = c(${values.join(', ')})${comma}`);
    });
    
    dataFrameLines.push(')');

    // Generate formula
    const formula = `${responseColumn} ~ ${predictorColumns.join(' + ')}`;

    // Generate complete R code
    const rCode = `${dataFrameLines.join('\n')}

# Fit linear model
model <- lm(
  formula = ${formula},
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
)

# Display model summary
summary(model)

# Plot the model
plot(model)`;

    return rCode;
  }

  /**
   * Get default linear regression code when no data is available
   * @returns {string} Default R code
   */
  static getDefaultLinearRegressionCode() {
    return `# Initialize data
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
)

# Display model summary
summary(model)

# Plot the model
plot(model)`;
  }

  /**
   * Generate arguments configuration based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} responseColumn - Name of the response variable column
   * @param {Array<string>} predictorColumns - Names of predictor variable columns
   * @returns {Array<Object>} Arguments configuration
   */
  static generateArguments(data, responseColumn, predictorColumns) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments();
    }

    const args = [];
    
    // Add formula argument
    const formula = `${responseColumn} ~ ${predictorColumns.join(' + ')}`;
    args.push({
      name: "Formula",
      value: formula,
      readOnly: true
    });

    // Add data initialization argument
    const dataConfig = [];
    dataConfig.push({ label: `${responseColumn}:`, value: data.map(row => row[responseColumn]).filter(val => val !== '').join(', ') });
    
    predictorColumns.forEach(col => {
      dataConfig.push({ 
        label: `${col}:`, 
        value: data.map(row => row[col]).filter(val => val !== '').join(', ') 
      });
    });

    args.push({
      name: "df (Initialize data)",
      type: "data",
      data: dataConfig
    });

    return args;
  }

  /**
   * Get default arguments when no data is available
   * @returns {Array<Object>} Default arguments
   */
  static getDefaultArguments() {
    return [
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
    ];
  }

  /**
   * Update data in the dataset
   * @param {Array<Object>} currentData - Current dataset
   * @param {number} rowIndex - Index of the row to update
   * @param {string} columnName - Name of the column to update
   * @param {string} newValue - New value
   * @returns {Array<Object>} Updated dataset
   */
  static updateDataValue(currentData, rowIndex, columnName, newValue) {
    if (!currentData || rowIndex < 0 || rowIndex >= currentData.length) {
      return currentData;
    }

    const updatedData = [...currentData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [columnName]: newValue
    };

    return updatedData;
  }

  /**
   * Get column names from data
   * @param {Array<Object>} data - Dataset
   * @returns {Array<string>} Column names
   */
  static getColumnNames(data) {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  /**
   * Validate data for linear regression
   * @param {Array<Object>} data - Dataset to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateDataForLinearRegression(data) {
    if (!data || data.length === 0) {
      return { isValid: false, errors: ['No data available'] };
    }

    const errors = [];
    const columns = this.getColumnNames(data);

    if (columns.length < 2) {
      errors.push('At least 2 columns are required for linear regression');
    }

    // Check for numeric data
    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(val => val !== '');
      const numericValues = values.filter(val => !isNaN(parseFloat(val)));
      
      if (numericValues.length < values.length * 0.8) {
        errors.push(`Column "${col}" contains mostly non-numeric values`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
