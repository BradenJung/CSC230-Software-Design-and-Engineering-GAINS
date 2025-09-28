import Head from "next/head";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const workflowSteps = [
  {
    number: "1",
    title: "Upload or Enter Data",
    description: "Import your dataset from a CSV file or manually enter data points directly into the platform. Our system supports various data formats and provides validation to ensure data integrity.",
    icon: "📊",
    dashboardIllustration: (
      <div className={styles.dashboardMockup}>
        <div className={styles.mockupHeader}>
          <div className={styles.mockupNav}>
            <span>Project</span>
            <span>Edit</span>
            <span>Import</span>
            <span>Export</span>
          </div>
        </div>
        <div className={styles.mockupContent}>
          <div className={styles.mockupLeftPanel}>
            <div className={styles.mockupPanelHeader}>
              <h4>Data Input</h4>
            </div>
            <div className={styles.mockupDataCard}>
              <div className={styles.mockupDataIcon}>📁</div>
              <div className={styles.mockupDataInfo}>
                <h5>CSV Upload</h5>
                <p>Drag & drop files</p>
              </div>
            </div>
            <div className={styles.mockupDataCard}>
              <div className={styles.mockupDataIcon}>✏️</div>
              <div className={styles.mockupDataInfo}>
                <h5>Manual Entry</h5>
                <p>Type data directly</p>
              </div>
            </div>
          </div>
          <div className={styles.mockupCenterPanel}>
            <div className={styles.mockupDataTable}>
              <div className={styles.mockupTableHeader}>
                <span>X1</span>
                <span>X2</span>
                <span>Y</span>
              </div>
              <div className={styles.mockupTableRow}>
                <span>1</span>
                <span>2</span>
                <span>5</span>
              </div>
              <div className={styles.mockupTableRow}>
                <span>2</span>
                <span>3</span>
                <span>7</span>
              </div>
              <div className={styles.mockupTableRow}>
                <span>3</span>
                <span>4</span>
                <span>8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    details: [
      "CSV file upload with automatic parsing",
      "Manual data entry with real-time validation",
      "Support for multiple data types (numeric, categorical, text)",
      "Data preview and editing capabilities"
    ]
  },
  {
    number: "2",
    title: "Select R Tool",
    description: "Choose from our comprehensive collection of R statistical tools including linear regression, bar charts, line charts, dot plots, and more advanced analytical methods.",
    icon: "🔧",
    dashboardIllustration: (
      <div className={styles.dashboardMockup}>
        <div className={styles.mockupHeader}>
          <div className={styles.mockupNav}>
            <span>Project</span>
            <span>Edit</span>
            <span>Import</span>
            <span>Export</span>
          </div>
        </div>
        <div className={styles.mockupContent}>
          <div className={styles.mockupLeftPanel}>
            <div className={styles.mockupPanelHeader}>
              <h4>Add R Tool</h4>
            </div>
            <div className={styles.mockupToolCard}>
              <div className={styles.mockupToolIcon}>📊</div>
              <div className={styles.mockupToolInfo}>
                <h5>Linear Regression</h5>
                <p>Statistical modeling</p>
              </div>
            </div>
            <div className={styles.mockupToolCard}>
              <div className={styles.mockupToolIcon}>📈</div>
              <div className={styles.mockupToolInfo}>
                <h5>Bar Chart</h5>
                <p>Data visualization</p>
              </div>
            </div>
            <div className={styles.mockupToolCard}>
              <div className={styles.mockupToolIcon}>📉</div>
              <div className={styles.mockupToolInfo}>
                <h5>Line Chart</h5>
                <p>Trend analysis</p>
              </div>
            </div>
          </div>
          <div className={styles.mockupCenterPanel}>
            <div className={styles.mockupToolDetails}>
              <h4>Linear Regression</h4>
              <div className={styles.mockupChartIcon}>📈</div>
              <div className={styles.mockupActionButtons}>
                <button>Copy R Code</button>
                <button>Download</button>
                <button>Edit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    details: [
      "Linear regression with diagnostic plots",
      "Various chart types (bar, line, scatter, dot plots)",
      "Statistical tests and hypothesis testing",
      "Data transformation and preprocessing tools"
    ]
  },
  {
    number: "3",
    title: "Export R Code",
    description: "Copy the generated R code to your clipboard or download it as a .R file to use directly in RStudio. All code is properly formatted and documented for easy understanding.",
    icon: "💻",
    dashboardIllustration: (
      <div className={styles.dashboardMockup}>
        <div className={styles.mockupHeader}>
          <div className={styles.mockupNav}>
            <span>Project</span>
            <span>Edit</span>
            <span>Import</span>
            <span>Export</span>
          </div>
        </div>
        <div className={styles.mockupContent}>
          <div className={styles.mockupCenterPanel}>
            <div className={styles.mockupCodeSection}>
              <h4>Code Snippet</h4>
              <div className={styles.mockupCodeBlock}>
                <pre>
{`# Initialize data
df <- data.frame(
  y = c(5, 7, 8, 6, 9),
  x1 = c(1, 2, 3, 4, 5),
  x2 = c(2, 3, 4, 5, 6)
)

# Fit linear model
model <- lm(y ~ x1 + x2, data = df)`}
                </pre>
              </div>
            </div>
          </div>
          <div className={styles.mockupRightPanel}>
            <div className={styles.mockupArguments}>
              <h4>Arguments</h4>
              <div className={styles.mockupArgGroup}>
                <label>Formula</label>
                <input value="y ~ x1 + x2" readOnly />
              </div>
              <div className={styles.mockupArgGroup}>
                <label>Data</label>
                <input value="df" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    details: [
      "Clean, well-commented R code generation",
      "One-click copy to clipboard functionality",
      "Download as .R file for RStudio",
      "Code includes all necessary libraries and setup"
    ]
  }
];

const features = [
  {
    title: "Educational Focus",
    description: "Designed specifically for CSC 230 Software Design students to learn statistical analysis and R programming through hands-on experience.",
    icon: "🎓"
  },
  {
    title: "No R Experience Required",
    description: "Generate professional R code without prior R programming knowledge. Perfect for beginners learning statistical computing.",
    icon: "🚀"
  },
  {
    title: "Instant Results",
    description: "See immediate visual feedback and generated code as you work with your data. No waiting, no complex setup required.",
    icon: "⚡"
  },
  {
    title: "RStudio Integration",
    description: "All generated code is optimized for RStudio and includes proper documentation and best practices.",
    icon: "🔗"
  }
];

export default function About() {
  return (
    <>
      <Head>
        <title>About GAINS - Statistical Analysis Platform</title>
        <meta name="description" content="Learn about GAINS platform workflow and features for statistical analysis and R code generation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.home}>
        <Header />
        <main className={styles.homeMain}>
          {/* Workflow Steps */}
          <section className={styles.featuresSection}>
            <div className={styles.sectionHeaderRow}>
              <h2 className={styles.sectionTitle}>How GAINS Works: 3 Simple Steps</h2>
              <p className={styles.sectionSubtitle}>
                Our streamlined workflow takes you from raw data to professional R code in minutes.
              </p>
            </div>
            <div className={styles.featureGrid}>
              {workflowSteps.map((step) => (
                <article key={step.number} className={styles.featureCard}>
                  <div className={styles.stepBadge}>{step.number}</div>
                  <div className={styles.featureIcon}>{step.icon}</div>
                  <h3 className={styles.featureTitle}>{step.title}</h3>
                  <p className={styles.featureDescription}>{step.description}</p>
                  <div className={styles.dashboardIllustration}>
                    {step.dashboardIllustration}
                  </div>
                  <ul className={styles.previewList}>
                    {step.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Available Tools Preview */}
          <section className={styles.previewSection}>
            <div className={styles.previewContent}>
              <h2 className={styles.sectionTitle}>Available R Tools</h2>
              <p className={styles.sectionSubtitle}>
                Explore our comprehensive collection of statistical analysis tools, each designed to generate clean, professional R code.
              </p>
              <ul className={styles.previewList}>
                <li>Linear Regression with diagnostic plots and model summaries</li>
                <li>Bar Charts for categorical data visualization</li>
                <li>Line Charts for time series and trend analysis</li>
                <li>Scatter Plots for correlation analysis</li>
                <li>Statistical tests and hypothesis testing tools</li>
              </ul>
              <Link href="/linear-regression" className={styles.inlineLink}>
                Explore the R Tools →
              </Link>
            </div>
            <div className={styles.previewCard}>
              <header className={styles.previewHeader}>
                <span className={styles.previewTag}>Example</span>
                <span className={styles.previewTitle}>Linear Regression Tool</span>
              </header>
              <div className={styles.previewSteps}>
                <div className={styles.previewStep}>
                  <span className={styles.stepBadge}>📊</span>
                  <div>
                    <p className={styles.stepLabel}>Data Input</p>
                    <p className={styles.stepDescription}>Upload CSV or enter data manually</p>
                  </div>
                </div>
                <div className={styles.previewStep}>
                  <span className={styles.stepBadge}>⚙️</span>
                  <div>
                    <p className={styles.stepLabel}>Configure Model</p>
                    <p className={styles.stepDescription}>Select variables and parameters</p>
                  </div>
                </div>
                <div className={styles.previewStep}>
                  <span className={styles.stepBadge}>💻</span>
                  <div>
                    <p className={styles.stepLabel}>Generate Code</p>
                    <p className={styles.stepDescription}>Copy R code for RStudio</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Team Information */}
          <section className={styles.ctaSection}>
            <div>
              <h2 className={styles.sectionTitle}>Built by CSC 230 Students</h2>
              <p className={styles.sectionSubtitle}>
                GAINS was developed as a collaborative project by Yaroslav, Jonathan, Aiden, Kevin, Murat, and Braden for the CSC 230 Software Design and Engineering course.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/linear-regression" className={styles.primaryButton}>
                Start Using GAINS
              </Link>
              <Link href="/home" className={styles.secondaryButton}>
                Back to Home
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
