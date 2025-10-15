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
   * Generate R code based on tool type and data
   * @param {string} toolId - Tool identifier (linear-regression, bar-chart, line-chart, dot-plot)
   * @param {Array<Object>} data - Parsed CSV data
   * @param {Object} selections - Tool-specific selections (responseColumn, predictorColumns, etc.)
   * @returns {string} Generated R code
   */
  static generateCode(toolId, data, selections = {}) {
    switch (toolId) {
      case 'linear-regression':
        return this.generateLinearRegressionCode(data, selections.responseColumn, selections.predictorColumns);
      case 'bar-chart':
        return this.generateBarChartCode(data, selections.categoryColumn, selections.valueColumn);
      case 'line-chart':
        return this.generateLineChartCode(data, selections.timeColumn, selections.valueColumn);
      case 'dot-plot':
        return this.generateDotPlotCode(data, selections.xColumn, selections.yColumn);
      case 'pie-chart':
        return this.generatePieChartCode(data, selections.categoryColumn, selections.valueColumn);
      default:
        return this.getDefaultCode(toolId);
    }
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
   * Generate R code for bar chart based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} categoryColumn - Name of the category column
   * @param {string} valueColumn - Name of the value column
   * @returns {string} Generated R code
   */
  static generateBarChartCode(data, categoryColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultBarChartCode();
    }

    const categories = data.map(row => row[categoryColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    const rCode = `# Initialize data
categories <- c(${categories.map(cat => `"${cat}"`).join(', ')})
values <- c(${values.join(', ')})

# Create data frame
df <- data.frame(
  category = categories,
  value = values
)

# Create bar chart
barplot(
  height = df$value,
  names.arg = df$category,
  main = "Bar Chart",
  xlab = "Categories",
  ylab = "Values",
  col = rainbow(length(categories)),
  border = "black"
)`;

    return rCode;
  }

  /**
   * Generate R code for line chart based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} timeColumn - Name of the time/index column
   * @param {string} valueColumn - Name of the value column
   * @returns {string} Generated R code
   */
  static generateLineChartCode(data, timeColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultLineChartCode();
    }

    const timePoints = data.map(row => row[timeColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    const rCode = `# Initialize data
time_points <- c(${timePoints.join(', ')})
values <- c(${values.join(', ')})

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
  main = "Line Chart",
  xlab = "Time Points",
  ylab = "Values",
  col = "blue",
  lwd = 2,
  pch = 16
)

# Add points
points(df$time, df$value, col = "red", pch = 16)`;

    return rCode;
  }

  /**
   * Generate R code for dot plot (scatter plot) based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} xColumn - Name of the x-axis column
   * @param {string} yColumn - Name of the y-axis column
   * @returns {string} Generated R code
   */
  static generateDotPlotCode(data, xColumn, yColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultDotPlotCode();
    }

    // Preserve numeric literals while safely quoting strings for R
    const formatValues = (values) =>
      values
        .map((value) => {
          if (value === null || value === undefined || value === '') {
            return 'NA';
          }
          const numericValue = Number(value);
          if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
            return `${numericValue}`;
          }
          const escaped = String(value).replace(/"/g, '\\"');
          return `"${escaped}"`;
        })
        .join(', ');

    const xValues = data.map(row => row[xColumn]).filter(val => val !== undefined && val !== null && val !== '');
    const yValues = data.map(row => row[yColumn]).filter(val => val !== undefined && val !== null && val !== '');

    if (!xValues.length || !yValues.length) {
      return this.getDefaultDotPlotCode();
    }

    const formattedX = formatValues(xValues);
    const formattedY = formatValues(yValues);

    const rCode = `# Initialize data
x_values <- c(${formattedX})
y_values <- c(${formattedY})

# Create data frame
df <- data.frame(
  x = x_values,
  y = y_values
)

# Create dot plot / scatter plot
plot(
  x = df$x,
  y = df$y,
  main = "Dot Plot",
  xlab = "${xColumn || 'X Values'}",
  ylab = "${yColumn || 'Y Values'}",
  pch = 19,
  col = "darkgreen"
)

# Add grid for readability
grid(col = "lightgray")`;

    return rCode;
  }

  /**
   * Generate R code for pie chart based on data
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} categoryColumn - Name of the category column
   * @param {string} valueColumn - Name of the value column
   * @returns {string} Generated R code
   */
  static generatePieChartCode(data, categoryColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultPieChartCode();
    }

    const categories = data.map(row => row[categoryColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    const rCode = `# Define the data vector with values
x <- c(${values.join(', ')})

# Define labels for each value in x
names(x) <- c(${categories.map(cat => `"${cat}"`).join(', ')})

# Set the output to be a PNG file
png(file = "piechart.png")

# Create the pie chart
pie(x, labels = names(x), col = "white",
    main = "Pie Chart", radius = -1,
    col.main = "darkgreen")

# Save the file
dev.off()`;

    return rCode;
  }

  /**
   * Get default code for a specific tool when no data is available
   * @param {string} toolId - Tool identifier
   * @returns {string} Default R code
   */
  static getDefaultCode(toolId) {
    switch (toolId) {
      case 'linear-regression':
        return this.getDefaultLinearRegressionCode();
      case 'bar-chart':
        return this.getDefaultBarChartCode();
      case 'line-chart':
        return this.getDefaultLineChartCode();
      case 'dot-plot':
        return this.getDefaultDotPlotCode();
      case 'pie-chart':
        return this.getDefaultPieChartCode();
      default:
        return this.getDefaultLinearRegressionCode();
    }
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
   * Get default bar chart code when no data is available
   * @returns {string} Default R code
   */
  static getDefaultBarChartCode() {
    return `# Initialize data
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
)`;
  }

  /**
   * Get default line chart code when no data is available
   * @returns {string} Default R code
   */
  static getDefaultLineChartCode() {
    return `# Initialize data
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
points(df$time, df$value, col = "red", pch = 16)`;
  }

  /**
   * Get default dot plot code when no data is available
   * @returns {string} Default R code
   */
  static getDefaultDotPlotCode() {
    return `# Initialize data
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
grid(col = "lightgray")`;
  }

  /**
   * Get default pie chart code when no data is available
   * @returns {string} Default R code
   */
  static getDefaultPieChartCode() {
    return `# Define the data vector with the number of articles
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
dev.off()`;
  }

  /**
   * Generate arguments configuration based on tool type and data
   * @param {string} toolId - Tool identifier
   * @param {Array<Object>} data - Parsed CSV data
   * @param {Object} selections - Tool-specific selections
   * @returns {Array<Object>} Arguments configuration
   */
  static generateArguments(toolId, data, selections = {}) {
    switch (toolId) {
      case 'linear-regression':
        return this.generateLinearRegressionArguments(data, selections.responseColumn, selections.predictorColumns);
      case 'bar-chart':
        return this.generateBarChartArguments(data, selections.categoryColumn, selections.valueColumn);
      case 'line-chart':
        return this.generateLineChartArguments(data, selections.timeColumn, selections.valueColumn);
      case 'dot-plot':
        return this.generateDotPlotArguments(data, selections.xColumn, selections.yColumn);
      case 'pie-chart':
        return this.generatePieChartArguments(data, selections.categoryColumn, selections.valueColumn);
      default:
        return this.getDefaultArguments(toolId);
    }
  }

  /**
   * Generate arguments configuration for linear regression
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} responseColumn - Name of the response variable column
   * @param {Array<string>} predictorColumns - Names of predictor variable columns
   * @returns {Array<Object>} Arguments configuration
   */
  static generateLinearRegressionArguments(data, responseColumn, predictorColumns) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments('linear-regression');
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
   * Generate arguments configuration for bar chart
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} categoryColumn - Name of the category column
   * @param {string} valueColumn - Name of the value column
   * @returns {Array<Object>} Arguments configuration
   */
  static generateBarChartArguments(data, categoryColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments('bar-chart');
    }

    const categories = data.map(row => row[categoryColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    return [
      { name: "Categories", value: categories.join(', '), readOnly: true },
      { name: "Values", value: values.join(', '), readOnly: true },
      { name: "Main Title", value: "Bar Chart", readOnly: false },
      { name: "X-axis Label", value: "Categories", readOnly: false },
      { name: "Y-axis Label", value: "Values", readOnly: false }
    ];
  }

  /**
   * Generate arguments configuration for line chart
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} timeColumn - Name of the time/index column
   * @param {string} valueColumn - Name of the value column
   * @returns {Array<Object>} Arguments configuration
   */
  static generateLineChartArguments(data, timeColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments('line-chart');
    }

    const timePoints = data.map(row => row[timeColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    return [
      { name: "Time Points", value: timePoints.join(', '), readOnly: true },
      { name: "Values", value: values.join(', '), readOnly: true },
      { name: "Main Title", value: "Line Chart", readOnly: false },
      { name: "X-axis Label", value: "Time Points", readOnly: false },
      { name: "Y-axis Label", value: "Values", readOnly: false },
      { name: "Line Color", value: "blue", readOnly: false }
    ];
  }

  /**
   * Generate arguments configuration for dot plot
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} xColumn - Name of the x-axis column
   * @param {string} yColumn - Name of the y-axis column
   * @returns {Array<Object>} Arguments configuration
   */
  static generateDotPlotArguments(data, xColumn, yColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments('dot-plot');
    }

    // Handoff raw string lists so the UI mirrors current data selections
    const xValues = data.map(row => row[xColumn]).filter(val => val !== undefined && val !== null && val !== '');
    const yValues = data.map(row => row[yColumn]).filter(val => val !== undefined && val !== null && val !== '');

    return [
      { name: "X Values", value: xValues.join(', '), readOnly: true },
      { name: "Y Values", value: yValues.join(', '), readOnly: true },
      { name: "Main Title", value: "Dot Plot", readOnly: false },
      { name: "X-axis Label", value: xColumn || "X Values", readOnly: false },
      { name: "Y-axis Label", value: yColumn || "Y Values", readOnly: false },
      { name: "Point Color", value: "darkgreen", readOnly: false },
      { name: "Point Size", value: "1.2", readOnly: false }
    ];
  }

  /**
   * Generate arguments configuration for pie chart
   * @param {Array<Object>} data - Parsed CSV data
   * @param {string} categoryColumn - Name of the category column
   * @param {string} valueColumn - Name of the value column
   * @returns {Array<Object>} Arguments configuration
   */
  static generatePieChartArguments(data, categoryColumn, valueColumn) {
    if (!data || data.length === 0) {
      return this.getDefaultArguments('pie-chart');
    }

    const categories = data.map(row => row[categoryColumn]).filter(val => val !== '');
    const values = data.map(row => row[valueColumn]).filter(val => val !== '');

    return [
      { name: "Categories", value: categories.join(', '), readOnly: true },
      { name: "Values", value: values.join(', '), readOnly: true },
      { name: "Main Title", value: "Pie Chart", readOnly: false },
      { name: "Output File", value: "piechart.png", readOnly: false },
      { name: "Colors", value: "white", readOnly: false },
      { name: "Title Color", value: "darkgreen", readOnly: false }
    ];
  }

  /**
   * Get default arguments when no data is available
   * @param {string} toolId - Tool identifier
   * @returns {Array<Object>} Default arguments
   */
  static getDefaultArguments(toolId) {
    switch (toolId) {
      case 'linear-regression':
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
      case 'bar-chart':
        return [
          { name: "Categories", value: "A, B, C, D, E", readOnly: false },
          { name: "Values", value: "23, 45, 56, 78, 32", readOnly: false },
          { name: "Main Title", value: "Bar Chart Example", readOnly: false },
          { name: "X-axis Label", value: "Categories", readOnly: false },
          { name: "Y-axis Label", value: "Values", readOnly: false }
        ];
      case 'line-chart':
        return [
          { name: "Time Points", value: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", readOnly: false },
          { name: "Values", value: "12, 15, 18, 22, 25, 23, 28, 32, 30, 35", readOnly: false },
          { name: "Main Title", value: "Line Chart Example", readOnly: false },
          { name: "X-axis Label", value: "Time Points", readOnly: false },
          { name: "Y-axis Label", value: "Values", readOnly: false },
          { name: "Line Color", value: "blue", readOnly: false }
        ];
      case 'dot-plot':
        // Dot-plot defaults mirror the standalone sample shown in the tool details
        return [
          { name: "X Values", value: "1, 2, 3, 4, 5, 6", readOnly: false },
          { name: "Y Values", value: "2.5, 3.1, 4.8, 3.6, 5.2, 4.9", readOnly: false },
          { name: "Main Title", value: "Dot Plot Example", readOnly: false },
          { name: "X-axis Label", value: "X Values", readOnly: false },
          { name: "Y-axis Label", value: "Y Values", readOnly: false },
          { name: "Point Color", value: "darkgreen", readOnly: false },
          { name: "Point Size", value: "1.2", readOnly: false }
        ];
      case 'pie-chart':
        return [
          { name: "Categories", value: "Algo, DS, Java, C, C++, Python", readOnly: false },
          { name: "Values", value: "210, 450, 250, 100, 50, 90", readOnly: false },
          { name: "Main Title", value: "Articles on GeeksforGeeks", readOnly: false },
          { name: "Output File", value: "piechart.png", readOnly: false },
          { name: "Colors", value: "white", readOnly: false },
          { name: "Title Color", value: "darkgreen", readOnly: false }
        ];
      default:
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
