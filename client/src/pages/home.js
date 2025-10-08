import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import styles from "../styles/Home.module.css";

const metrics = [
  { label: "Datasets Analyzed", value: "1,200+" },
  { label: "Predictive Models", value: "85%+ accuracy" },
  { label: "Interactive Views", value: "8 chart types" },
];

const features = [
  {
    icon: "LR",
    title: "Guided Linear Regression",
    description:
      "Upload sample data, fit regression models, and review diagnostics with confidence bands.",
  },
  {
    icon: "BC",
    title: "Dynamic Bar Charts",
    description:
      "Build comparisons in seconds with color-coded bars, hover states, and export-ready graphics.",
  },
  {
    icon: "LC",
    title: "Animated Line Charts",
    description:
      "Track trends over time, layer multiple series, and surface insights with guided annotations.",
  },
];

const previewChecklist = [
  "Import your CSV or use our curated practice datasets.",
  "Follow step-by-step prompts to configure models and visuals.",
  "Share polished dashboards with your teammates in one click.",
];

export default function Home() {
  const [backendMessage, setBackendMessage] = useState(null);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    async function fetchBackendMessage() {
      try {
        const response = await fetch("http://localhost:3000/api/welcome");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        setBackendMessage(data);
        setBackendError(null);
      } catch (error) {
        //console.error("Backend fetch failed", error);
        setBackendMessage(null);
        setBackendError("Unable to reach backend");
      }
    }

    fetchBackendMessage();
  }, []);

  return (
    <div className={styles.home}>
      <Header />
      <main className={styles.homeMain}>
        <section className={styles.heroSection}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>CSC 230 Software Design</p>

            {backendMessage && (
              <div className={styles.backendBanner}>
                <p className={styles.backendBannerTitle}>{backendMessage.title}</p>
                <p className={styles.backendBannerBody}>{backendMessage.body}</p>
              </div>
            )}

            {backendError && (
              <div className={styles.backendBannerError}>{backendError}</div>
            )}

            <h1 className={styles.heroTitle}>
              Prototype, analyze, and present data stories in minutes.
            </h1>
            <p className={styles.heroSubtitle}>
              Explore a sandbox of statistical tools built for quick experimentation. Jump into
              regression, iterate on visuals, and keep collaborators aligned with a shared workspace.
            </p>
            <p className={styles.heroCaption}>By Yaroslav, Jonathan, Aiden, Kevin, Murat, Braden</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryButton}>
                Create an account
              </Link>
              <Link href="/linear-regression" className={styles.secondaryButton}>
                Sign In
              </Link>
            </div>
          </div>
          <div className={styles.heroIllustration} aria-hidden="true">
            <div className={styles.illustrationHeader}>
              <div className={styles.statusDot} />
              <div className={styles.statusDot} />
              <div className={styles.statusDot} />
            </div>
            <div className={styles.illustrationBody}>
              <div className={styles.chartPlaceholder}>
                <div className={styles.chartBars}>
                  <span style={{ height: "24%" }} />
                  <span style={{ height: "60%" }} />
                  <span style={{ height: "85%" }} />
                  <span style={{ height: "45%" }} />
                </div>
                <div className={styles.chartLegend}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className={styles.chartMetrics}>
                <p className={styles.chartMetricLabel}>R^2 Score</p>
                <p className={styles.chartMetricValue}>0.87</p>
                <p className={styles.chartMetricLabel}>MAE</p>
                <p className={styles.chartMetricValue}>3.4</p>
                <p className={styles.chartMetricLabel}>Next step</p>
                <p className={styles.chartMetricValue}>Share results</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Tools that make analysis approachable</h2>
          </div>
          <div className={styles.metricsGrid}>
            {metrics.map(({ value, label }) => (
              <div key={label} className={styles.metricCard}>
                <p className={styles.metricValue}>{value}</p>
                <p className={styles.metricLabel}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Built for fast classroom experimentation</h2>
            <p className={styles.sectionSubtitle}>
              Mix and match visualizations, run regressions, and document findings without leaving the
              workspace.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ icon, title, description }) => (
              <article key={title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{icon}</div>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureDescription}>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.previewSection}>
          <div className={styles.previewContent}>
            <h2 className={styles.sectionTitle}>From upload to insights in three guided steps</h2>
            <ul className={styles.previewList}>
              {previewChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/bar-chart" className={styles.inlineLink}>
              Preview the bar chart module
            </Link>
          </div>
          <div className={styles.previewCard}>
            <header className={styles.previewHeader}>
              <span className={styles.previewTag}>Workflow</span>
              <span className={styles.previewTitle}>GAINS Scenario Builder</span>
            </header>
            <div className={styles.previewSteps}>
              <div className={styles.previewStep}>
                <span className={styles.stepBadge}>1</span>
                <div>
                  <p className={styles.stepLabel}>Load dataset</p>
                  <p className={styles.stepDescription}>Sample: neighborhood-energy.csv</p>
                </div>
              </div>
              <div className={styles.previewStep}>
                <span className={styles.stepBadge}>2</span>
                <div>
                  <p className={styles.stepLabel}>Select model</p>
                  <p className={styles.stepDescription}>Linear regression with 4 predictors</p>
                </div>
              </div>
              <div className={styles.previewStep}>
                <span className={styles.stepBadge}>3</span>
                <div>
                  <p className={styles.stepLabel}>Share dashboard</p>
                  <p className={styles.stepDescription}>Export slides or share link</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div>
            <h2 className={styles.sectionTitle}>Ready to test-drive the GAINS toolkit?</h2>
            <p className={styles.sectionSubtitle}>
              Log in to resume your current scenario or start a fresh analysis with the latest class
              dataset.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/login" className={styles.primaryButton}>
              Log in
            </Link>
            <Link href="/signup" className={styles.secondaryButton}>
              Join the workspace
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
