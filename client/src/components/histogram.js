import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip
} from "recharts";

export default function HistogramTool({
  dataRows = [],
  valueColumn = "",
  defaultTitle = "Histogram Example"
} = {}) {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [breaks, setBreaks] = useState(5);
  const [csvFile, setCsvFile] = useState(null);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]);
  const [mainTitle, setMainTitle] = useState(defaultTitle || "Histogram Example");
  const [xLabel, setXLabel] = useState("Values");
  const [color, setColor] = useState("darkorange");

  const parseNumbers = (input) =>
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);

  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Boolean(valueColumn);

  const projectValues = useMemo(() => {
    if (!usingProjectData) {
      return [];
    }
    return dataRows
      .map((row) => Number(row?.[valueColumn]))
      .filter(Number.isFinite);
  }, [dataRows, valueColumn, usingProjectData]);

  useEffect(() => {
    if (!usingProjectData) {
      return;
    }
    setMainTitle(defaultTitle || "Histogram Example");
    setXLabel(valueColumn || "Values");
    if (!projectValues.length) {
      setError("Selected column has no numeric values.");
      setChartData([]);
      return;
    }
    setValues(projectValues.join(","));
    setChartData(buildHistogramData(projectValues, breaks));
    setError("");
  }, [usingProjectData, projectValues, breaks, valueColumn, defaultTitle]);

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const data = lines
            .map(line => line.trim())
            .filter(line => line)
            .map(line => line.split(','))
            .flat()
            .filter(value => !isNaN(value.trim()));
          
          if (data.length) {
            setValues(data.join(','));
            setCsvFile(file.name);
            setError("");
          } else {
            setError("No valid numeric data found in the CSV file.");
          }
        } catch (err) {
          setError("Error parsing CSV file: " + err.message);
        }
      };
      reader.onerror = () => {
        setError("Error reading file");
      };
      reader.readAsText(file);
    }
  };

  const buildHistogramData = (numbers, binCount) => {
    if (!numbers.length) {
      return [];
    }
    const cleanBinCount = Math.max(1, Number.isFinite(binCount) ? Math.floor(binCount) : 1);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const span = max - min || 1;
    const step = span / cleanBinCount;
    const bins = Array.from({ length: cleanBinCount }, (_, index) => {
      const start = min + index * step;
      const end = index === cleanBinCount - 1 ? max : start + step;
      return {
        start,
        end,
        count: 0,
        label: `${start.toFixed(2)} – ${end.toFixed(2)}`
      };
    });
    numbers.forEach((value) => {
      const relative = value - min;
      const index = Math.min(
        cleanBinCount - 1,
        Math.floor(relative / step)
      );
      bins[index].count += 1;
    });
    return bins;
  };

  const runR = () => {
    if (usingProjectData) {
      if (!projectValues.length) {
        setError("Selected column has no numeric values.");
        setChartData([]);
        return;
      }
      setChartData(buildHistogramData(projectValues, breaks));
      setError("");
      return;
    }
    const numericValues = parseNumbers(values);
    if (!numericValues.length) {
      setError("Please provide at least one numeric value.");
      setChartData([]);
      return;
    }
    setChartData(buildHistogramData(numericValues, breaks));
    setError("");
  };

  const totalCount = useMemo(
    () => chartData.reduce((sum, bin) => sum + bin.count, 0),
    [chartData]
  );

  const panelStyle = {
    background: "var(--surface-secondary, #151a24)",
    border: "1px solid var(--border-muted, #2a3244)",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12
  };

  const fieldWrapperStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: "1 1 180px",
    minWidth: 160
  };

  const labelTextStyle = {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-muted, #a8b3c9)"
  };

  const inputStyle = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid var(--border-muted, #2a3244)",
    background: "var(--surface-tertiary, #0f1724)",
    color: "var(--foreground, #f5f7fb)",
    padding: "10px 12px",
    fontSize: "0.95rem",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Histogram</h1>
      {usingProjectData ? (
        <p>
          Using <strong>{valueColumn}</strong> from the imported dataset ({projectValues.length} row
          {projectValues.length === 1 ? "" : "s"}).
        </p>
      ) : (
        <p>Enter values as comma-separated numbers or upload a CSV file.</p>
      )}
      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Upload CSV file</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                style={inputStyle}
              />
            </label>
            {csvFile && <p style={{ margin: 0, fontSize: "0.9em", color: "green" }}>Loaded: {csvFile}</p>}
            {error && <p style={{ margin: 0, fontSize: "0.9em", color: "crimson" }}>{error}</p>}
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Values</span>
              <input value={values} onChange={(e)=>setValues(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}
        <div style={{ ...panelStyle, flexDirection: "row", flexWrap: "wrap" }}>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Breaks</span>
            <input type="number" min={1} value={breaks} onChange={e=>setBreaks(+e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Title</span>
            <input value={mainTitle} onChange={e=>setMainTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>X Label</span>
            <input value={xLabel} onChange={e=>setXLabel(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Bar Color</span>
            <input value={color} onChange={e=>setColor(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <button onClick={runR}>Generate</button>
      </div>

      <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #eee" }}>
        {chartData.length ? (
          <>
            <h2 style={{ marginBottom: 12 }}>{mainTitle}</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#4b5563" }} />
                <Tooltip
                  contentStyle={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}
                  labelStyle={{ color: "#111827", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill={color} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ marginTop: 12, color: "#4b5563" }}>
              Total observations: <strong>{totalCount}</strong>
            </p>
            <p style={{ marginTop: 4, color: "#4b5563" }}>{xLabel}</p>
          </>
        ) : (
          <p style={{ color: "#4b5563" }}>Click Generate after importing or entering values to view the histogram.</p>
        )}
      </div>

      {usingProjectData && error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
