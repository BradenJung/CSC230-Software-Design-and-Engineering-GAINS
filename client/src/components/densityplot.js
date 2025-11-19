import { useState, useMemo } from "react";
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

export default function DensityTool() {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [kernel, setKernel] = useState("gaussian");
  const [bandwidth, setBandwidth] = useState("");
  const [mainTitle, setMainTitle] = useState("Density Plot Example");
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
  const [valueColumn, setValueColumn] = useState(null);
  const [autoGenerateOnUpload, setAutoGenerateOnUpload] = useState(false);
  const MAX_PREVIEW_ROWS = 20;

  const parseNumbers = (input) =>
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);

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
        setValueColumn(suggested);

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
    if (!csvRows.length) return;
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
      return <p style={{ color: "#9fb3d8" }}>Enter values and click Generate to see the density curve.</p>;
    }
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={kdePreview}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="x"
            tickFormatter={(value) => value.toFixed(1)}
            tick={{ fill: "#b8c7e0", fontSize: 12 }}
            label={{ value: xLabel, position: "insideBottom", offset: -4, fill: "#b8c7e0" }}
          />
          <YAxis tick={{ fill: "#b8c7e0" }} />
          <Tooltip
            formatter={(value) => value.toFixed(4)}
            contentStyle={{ background: "#0f1b2b", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}
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

  const runR = () => {
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
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Density Plot</h1>
      <p>Enter numeric values separated by commas to estimate their density curve.</p>

      <div style={{ display: "grid", gap: 12 }}>
        {/* CSV Upload */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            Upload CSV (comma/semicolon/tab). First numeric column will be suggested.
            <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ marginLeft: 8 }} />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={autoGenerateOnUpload}
              onChange={(e) => setAutoGenerateOnUpload(e.target.checked)}
            />
            Auto-generate after upload
          </label>
          {csvFileName && <div style={{ marginTop: 8, fontSize: "0.9em", color: "green" }}>Loaded: {csvFileName}</div>}

          {csvColumns.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Value column
                <select
                  value={valueColumn ?? ''}
                  onChange={(e) => { const idx = e.target.value === '' ? null : Number(e.target.value); setValueColumn(idx); applyColumnSelection(idx); }}
                  style={{ marginLeft: 8 }}
                >
                  {csvColumns.map((c, i) => (
                    <option key={i} value={i}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <label>
          Values
          <input value={values} onChange={(e) => setValues(e.target.value)} />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <label>
            Kernel
            <select value={kernel} onChange={(e) => setKernel(e.target.value)}>
              <option value="gaussian">gaussian</option>
              <option value="epanechnikov">epanechnikov</option>
              <option value="rectangular">rectangular</option>
              <option value="triangular">triangular</option>
              <option value="biweight">biweight</option>
              <option value="cosine">cosine</option>
              <option value="optcosine">optcosine</option>
            </select>
          </label>
          <label>
            Bandwidth (optional)
            <input
              type="number"
              min={0}
              step="any"
              value={bandwidth}
              onChange={(e) => setBandwidth(e.target.value)}
            />
          </label>
          <label>
            Title
            <input value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} />
          </label>
          <label>
            X Label
            <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} />
          </label>
          <label>
            Line Color
            <input value={lineColor} onChange={(e) => setLineColor(e.target.value)} />
          </label>
          <label>
            Fill Color
            <input value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={fillArea}
              onChange={(e) => setFillArea(e.target.checked)}
            />
            Fill Area
          </label>
        </div>

        <button onClick={runR}>Generate</button>
      </div>

      <div style={{ marginTop: 24, background: "#090f1a", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
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
