import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function DensityTool({
  dataRows = [],
  valueColumn = "",
  defaultTitle = "Density Plot Example"
} = {}) {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [kernel, setKernel] = useState("gaussian");
  const [bandwidth, setBandwidth] = useState("");
  const [mainTitle, setMainTitle] = useState(defaultTitle || "Density Plot Example");
  const [xLabel, setXLabel] = useState("Values");
  const [lineColor, setLineColor] = useState("steelblue");
  const [fillColor, setFillColor] = useState("lightsteelblue");
  const [fillArea, setFillArea] = useState(true);
  const [error, setError] = useState("");

  // CSV & preview state
  const [csvFileName, setCsvFileName] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvValueColumn, setCsvValueColumn] = useState(null);
  const [autoGenerateOnUpload, setAutoGenerateOnUpload] = useState(false);
  const MAX_PREVIEW_ROWS = 20;

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
    setMainTitle(defaultTitle || "Density Plot Example");
    setXLabel(valueColumn || "Values");
    if (!projectValues.length) {
      setValues("");
      setError("Selected column has no numeric values.");
      return;
    }
    setValues(projectValues.join(","));
    setError("");
  }, [usingProjectData, projectValues, valueColumn, defaultTitle]);

  // CSV handling (PapaParse) and helpers
  const handleCsvUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (!rows || !rows.length) {
          setError('CSV is empty or could not be parsed');
          return;
        }
        const first = rows[0];
        const hasHeader = (first[0] && isNaN(Number(first[0]))) || (first[1] && isNaN(Number(first[1])));
        const cols = (hasHeader ? first : rows[0]).map((c, i) => (c && String(c).trim()) ? String(c).trim() : `Col ${i+1}`);
        setCsvColumns(cols);
        setCsvRows(rows);
        setCsvPreview(rows.slice(0, MAX_PREVIEW_ROWS));
        setCsvFileName(file.name);
        setError("");

        const dataRows = hasHeader ? rows.slice(1) : rows;
        // detect numeric column for values
        const numericCols = (dataRows[0] || []).map((_, colIdx) => {
          const sample = dataRows.slice(0, Math.min(8, dataRows.length));
          return sample.every(r => !isNaN(Number(r[colIdx]))) ? colIdx : null;
        }).filter(i => i !== null);
        const suggested = numericCols.length ? numericCols[0] : 0;
        setCsvValueColumn(suggested);

        if (autoGenerateOnUpload) {
          const vals = dataRows.map(r => r[suggested]).map(v => (v||'').trim()).filter(v => v !== '');
          setValues(vals.join(','));
          setTimeout(() => runR(), 50);
        }
      },
      error: (err) => setError('CSV parse error: ' + err.message)
    });
  };

  const applyColumnSelection = (colIdx) => {
    if (!csvRows.length || colIdx === null || colIdx === undefined) return;
    const hasHeader = csvColumns.length && csvRows.length && (csvColumns[0] !== `Col 1`);
    const dataRows = hasHeader ? csvRows.slice(1) : csvRows;
    const vals = dataRows.map(r => r[colIdx]).map(v => (v||'').trim()).filter(v => v !== '');
    setValues(vals.join(','));
  };

  // In-browser KDE preview
  const kdePreview = useMemo(() => {
    const xs = parseNumbers(values);
    if (!xs.length) return null;
    const n = xs.length;
    const mean = xs.reduce((a,b)=>a+b,0)/n;
    const sd = Math.sqrt(xs.reduce((a,b)=>a + Math.pow(b-mean,2),0)/n) || 1;
    const h = bandwidth ? Number(bandwidth) : (1.06 * sd * Math.pow(n, -1/5));
    const kernelFn = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    const min = Math.min(...xs) - sd;
    const max = Math.max(...xs) + sd;
    const gridN = 120;
    const step = (max - min) / (gridN - 1);
    const points = Array.from({length: gridN}, (_,i) => {
      const x = min + i * step;
      const density =
        xs.reduce((acc, xi) => acc + kernelFn((x - xi)/h), 0) / (n * h);
      return { x, density };
    });
    return points;
  }, [values, bandwidth]);

  const renderChart = () => {
    if (!kdePreview || !kdePreview.length) {
      return <p style={{ color: "#4b5563" }}>Enter values to see the density curve.</p>;
    }
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={kdePreview}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            tickFormatter={(value) => value.toFixed(1)}
            tick={{ fill: "#4b5563", fontSize: 12 }}
            label={{ value: xLabel, position: "insideBottom", offset: -4, fill: "#4b5563" }}
          />
          <YAxis tick={{ fill: "#4b5563" }} />
          <Tooltip
            formatter={(value) => value.toFixed(4)}
            contentStyle={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", color: "#1f2933" }}
          />
          <Area
            type="monotone"
            dataKey="density"
            stroke={lineColor}
            fill={fillArea ? fillColor : "transparent"}
            fillOpacity={fillArea ? 0.4 : 0}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const runR = useCallback(() => {
    const numericValues = parseNumbers(values);
    if (!numericValues.length) {
      setError("Please provide at least one numeric value.");
      return;
    }

    if (!kdePreview || !kdePreview.length) {
      setError("Unable to compute density curve. Check your inputs.");
      return;
    }
    setError("");
  }, [values, kdePreview]);

  useEffect(() => {
    if (usingProjectData) {
      return;
    }
    runR();
  }, [usingProjectData, runR]);

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
      <h1>R Density Plot</h1>
      {usingProjectData ? (
        <p>
          Using <strong>{valueColumn}</strong> from the imported dataset ({projectValues.length} row
          {projectValues.length === 1 ? "" : "s"}).
        </p>
      ) : (
        <p>Enter numeric values separated by commas to estimate their density curve.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Upload CSV (comma/semicolon/tab). First numeric column will be suggested.</span>
              <input type="file" accept=".csv" onChange={handleCsvUpload} style={inputStyle} />
            </label>
            <label style={{ ...fieldWrapperStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={autoGenerateOnUpload}
                onChange={(e) => setAutoGenerateOnUpload(e.target.checked)}
              />
              <span style={labelTextStyle}>Auto-generate after upload</span>
            </label>
            {csvFileName && <div style={{ fontSize: "0.9em", color: "green" }}>Loaded: {csvFileName}</div>}

            {csvColumns.length > 0 && (
              <label style={fieldWrapperStyle}>
                <span style={labelTextStyle}>Value column</span>
                <select
                  value={csvValueColumn ?? ""}
                  onChange={(e) => {
                    const idx = e.target.value === "" ? null : Number(e.target.value);
                    setCsvValueColumn(idx);
                    if (idx !== null) {
                      applyColumnSelection(idx);
                    }
                  }}
                  style={inputStyle}
                >
                  {csvColumns.map((c, i) => (
                    <option key={i} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Values</span>
              <input value={values} onChange={(e) => setValues(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        <div style={{ ...panelStyle, flexDirection: "row", flexWrap: "wrap" }}>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Kernel</span>
            <select value={kernel} onChange={(e) => setKernel(e.target.value)} style={inputStyle}>
              <option value="gaussian">gaussian</option>
              <option value="epanechnikov">epanechnikov</option>
              <option value="rectangular">rectangular</option>
              <option value="triangular">triangular</option>
              <option value="biweight">biweight</option>
              <option value="cosine">cosine</option>
              <option value="optcosine">optcosine</option>
            </select>
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Bandwidth (optional)</span>
            <input
              type="number"
              min={0}
              step="any"
              value={bandwidth}
              onChange={(e) => setBandwidth(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Title</span>
            <input value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>X Label</span>
            <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Line Color</span>
            <input value={lineColor} onChange={(e) => setLineColor(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Fill Color</span>
            <input value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ ...fieldWrapperStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={fillArea} onChange={(e) => setFillArea(e.target.checked)} />
            <span style={labelTextStyle}>Fill Area</span>
          </label>
        </div>

      </div>

      <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #eee" }}>
        <h2 style={{ marginBottom: 12 }}>{mainTitle}</h2>
        {renderChart()}
      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
