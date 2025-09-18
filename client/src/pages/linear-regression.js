import Head from "next/head";
import { useState } from "react";
import styles from "../styles/Home.module.css";

export default function linear() {
  const [selectedTool, setSelectedTool] = useState("linear-regression");

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
    }
  ];

  // Get current tool configuration
  const currentTool = tools.find(tool => tool.id === selectedTool);

  return (
    <>
      <Head>
        <title>Add R Tool</title>
        <meta name="description" content="R programming language tools dashboard for statistical students" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.dashboard}>
        {/* Top Navigation */}
        <nav className={styles.navbar}>
          <div className={styles.navLinks}>
            <a href="#" className={styles.navLink}>Project</a>
            <a href="#" className={styles.navLink}>Edit</a>
            <a href="#" className={styles.navLink}>Import</a>
            <a href="#" className={styles.navLink}>Export</a>
          </div>
        </nav>

        <div className={styles.mainContent}>
          {/* Left Panel - Tool Selection */}
          <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
              <h2>Add R Tool</h2>
              <p>Select one of the provided RStudio tools.</p>
            </div>
            
            <div className={styles.toolList}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className={`${styles.toolCard} ${selectedTool === tool.id ? styles.selected : ''}`}
                  onClick={() => setSelectedTool(tool.id)}
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
              
              <div className={styles.actionButtons}>
                <button className={styles.actionBtn}>
                  <span>{"{}"}</span>
                  Copy R Code
                </button>
                <button className={styles.actionBtn}>
                  <span>⬇</span>
                  Download R Code
                </button>
                <button className={styles.actionBtn}>
                  <span>✏</span>
                  Edit
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className={styles.dataTable}>
              <table>
                <thead>
                  <tr>
                    {currentTool?.sampleData && currentTool.sampleData.length > 0 && 
                      Object.keys(currentTool.sampleData[0]).map((key) => (
                        <th key={key}>{key.toUpperCase()}</th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {currentTool?.sampleData?.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel - Code and Arguments */}
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
                <pre><code>{currentTool?.rCode}</code></pre>
              </div>
              <p className={styles.codeDescription}>
                {currentTool?.codeDescription}
              </p>
            </div>

            <div className={styles.argumentsSection}>
              <h3>Arguments</h3>
              {currentTool?.arguments?.map((arg, index) => (
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
        </div>
      </div>
    </>
  );
}
