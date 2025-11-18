import { useState, useMemo } from "react";
import Papa from "papaparse";

export default function DensityTool() {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [kernel, setKernel] = useState("gaussian");
  const [bandwidth, setBandwidth] = useState("");
  const [mainTitle, setMainTitle] = useState("Density Plot Example");
  const [xLabel, setXLabel] = useState("Values");
  const [lineColor, setLineColor] = useState("steelblue");
  const [fillColor, setFillColor] = useState("lightsteelblue");
  const [fillArea, setFillArea] = useState(true);
  const [imgSrc, setImgSrc] = useState("");
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
    const kernel = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    const min = Math.min(...xs) - sd;
    const max = Math.max(...xs) + sd;
    const gridN = 120;
    const step = (max - min) / (gridN - 1);
    const grid = Array.from({length: gridN}, (_,i) => min + i * step);
    const dens = grid.map(x => {
      const s = xs.reduce((acc, xi) => acc + kernel((x - xi)/h), 0);
      return s / (n * h);
    });
    const maxD = Math.max(...dens);
    return { grid, dens, min, max, maxD };
  }, [values, bandwidth]);

  const runR = async () => {
    const numericValues = parseNumbers(values);
    if (!numericValues.length) {
      setError("Please provide at least one numeric value.");
      setImgSrc("");
      return;
    }

    setError("");

    try {
      const res = await fetch("/api/run-r", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: numericValues,
          kernel,
          bandwidth: bandwidth ? Number(bandwidth) : null,
          mainTitle,
          xLabel,
          lineColor,
          fillColor,
          fillArea
        })
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.imageBase64) {
        setImgSrc(`data:image/png;base64,${data.imageBase64}`);
      } else {
        setError("R script did not return an image. Check server logs for details.");
        console.error(data);
      }
    } catch (err) {
      setError(err.message || "Unable to generate density plot.");
    }
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
        {kdePreview && (
          <div style={{ marginTop: 12 }}>
            <svg width={600} height={160} style={{ display: 'block', background: '#fff', border: '1px solid #eee' }}>
              {(() => {
                const w = 600, h = 160, p = 28;
                const { grid, dens, min, max, maxD } = kdePreview;
                if (!grid || !grid.length) return null;
                const scaleX = (x) => p + ((x - min) / (max - min || 1)) * (w - 2 * p);
                const scaleY = (d) => h - p - (d / (maxD || 1)) * (h - 2 * p);
                const points = grid.map((x, i) => `${scaleX(x)},${scaleY(dens[i])}`);
                const path = 'M ' + points.join(' L ');
                const areaPath = path + ` L ${scaleX(grid[grid.length-1])},${h-p} L ${scaleX(grid[0])},${h-p} Z`;
                return (
                  <g>
                    {fillArea && <path d={areaPath} fill={fillColor} opacity={0.4} stroke="none" />}
                    <path d={path} fill="none" stroke={lineColor} strokeWidth={2} />
                  </g>
                );
              })()}
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          {error}
        </p>
      )}

      {imgSrc && (
        <div style={{ marginTop: 16 }}>
          <img
            src={imgSrc}
            alt="R Density Plot"
            style={{ maxWidth: "100%", border: "1px solid #eee" }}
          />
        </div>
      )}
    </div>
  );
}
