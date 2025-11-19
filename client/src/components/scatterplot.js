import { useEffect, useMemo, useState } from "react";

export default function ScatterplotTool({
  dataRows = [],
  xColumn = "",
  yColumn = "",
  defaultTitle = "Scatter Plot Example"
} = {}) {
  const [xValues, setXValues] = useState("1,2,3,4,5,6,7,8,9,10");
  const [yValues, setYValues] = useState("12,15,18,22,25,23,28,32,30,35");
  const [csvFile, setCsvFile] = useState(null);

  const [mainTitle, setMainTitle] = useState(defaultTitle || "Scatter Plot Example");
  const [xLabel, setXLabel] = useState("X Values");
  const [yLabel, setYLabel] = useState("Y Values");
  const [pointColor, setPointColor] = useState("steelblue");
  const [pointSize, setPointSize] = useState(4);

  const [error, setError] = useState("");

  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Boolean(xColumn) &&
    Boolean(yColumn);

  useEffect(() => {
    setMainTitle(defaultTitle || "Scatter Plot Example");
  }, [defaultTitle]);

  useEffect(() => {
    if (usingProjectData) {
      setXLabel(xColumn || "X Values");
      setYLabel(yColumn || "Y Values");
    }
  }, [usingProjectData, xColumn, yColumn]);

  // csv parsing 
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(","));
        if (!rows.length || rows[0].length < 2)
          throw new Error("Expected two columns (X,Y).");

        const hasHeader =
          isNaN(Number(rows[0][0])) || isNaN(Number(rows[0][1]));
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const xs = dataRows.map((r) => Number(r[0])).filter(Number.isFinite);
        const ys = dataRows.map((r) => Number(r[1])).filter(Number.isFinite);

        if (!xs.length || xs.length !== ys.length)
          throw new Error("Invalid CSV: unequal or empty X/Y values.");

        setXValues(xs.join(","));
        setYValues(ys.join(","));
        setCsvFile(file.name);
        setError("");
      } catch (err) {
        setError("CSV error: " + err.message);
      }
    };
    reader.onerror = () => setError("Error reading file");
    reader.readAsText(file);
  };

  const projectData = useMemo(() => {
    if (!usingProjectData) {
      return null;
    }
    return dataRows
      .map((row) => {
        const rawX = row?.[xColumn];
        const rawY = row?.[yColumn];
        const parsedX = Number(rawX);
        const parsedY = Number(rawY);
        if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) {
          return null;
        }
        return { x: parsedX, y: parsedY };
      })
      .filter(Boolean);
  }, [dataRows, xColumn, yColumn, usingProjectData]);

  const manualData = useMemo(() => {
    const xs = xValues
      .split(",")
      .map((v) => Number(v.trim()))
      .filter(Number.isFinite);
    const ys = yValues
      .split(",")
      .map((v) => Number(v.trim()))
      .filter(Number.isFinite);
    return xs.length && xs.length === ys.length
      ? xs.map((x, i) => ({ x, y: ys[i] }))
      : [];
  }, [xValues, yValues]);

  const data = usingProjectData ? projectData || [] : manualData;
  const projectDataValid = !usingProjectData || (projectData && projectData.length > 0);
  const displayError = usingProjectData
    ? (projectDataValid ? "" : "Selected columns do not contain numeric values.")
    : error;

  // --- chart layout
  const width = 800, height = 480, pad = 50;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (!data.length) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = data.map(d => d.x);
    const ys = data.map(d => d.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  }, [data]);

  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * innerW;
  const sy = (y) => pad + innerH - ((y - minY) / (maxY - minY || 1)) * innerH;

  function makeTicks(min, max, count = 5) {
    const span = max - min || 1;
    const step = span / (count - 1);
    return Array.from({ length: count }, (_, i) => min + i * step);
  }
  const xTicks = makeTicks(minX, maxX);
  const yTicks = makeTicks(minY, maxY);

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
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1>{mainTitle}</h1>
      {usingProjectData ? (
        <p>
          Using <strong>{xColumn}</strong> vs <strong>{yColumn}</strong> from the imported dataset (
          {data.length} row{data.length === 1 ? "" : "s"}).
        </p>
      ) : (
        <p>Provide X and Y values as comma-separated numbers or upload a CSV file.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            {/* CSV Upload */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Upload CSV file (2 columns: X,Y)
                <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ marginLeft: 8 }} />
              </label>
              {csvFile && (
                <p style={{ margin: "4px 0", fontSize: "0.9em", color: "green" }}>
                  Loaded: {csvFile}
                </p>
              )}
            </div>

            {/* Manual entry */}
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>X Values</span>
              <input
                value={xValues}
                onChange={(e) => setXValues(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Y Values</span>
              <input
                value={yValues}
                onChange={(e) => setYValues(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        )}

        {/* Options */}
        <div style={{ ...panelStyle, flexDirection: "row", flexWrap: "wrap" }}>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Title</span>
            <input value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>X Label</span>
            <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Y Label</span>
            <input value={yLabel} onChange={(e) => setYLabel(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Point Color</span>
            <input value={pointColor} onChange={(e) => setPointColor(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldWrapperStyle}>
            <span style={labelTextStyle}>Point Size</span>
            <input
              type="number"
              min={1}
              step={1}
              value={pointSize}
              onChange={(e) => setPointSize(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      {displayError && <p style={{ color: "crimson", marginTop: 12 }}>{displayError}</p>}

      {/* SVG Chart */}
      <div style={{ marginTop: 16, background: "#fff", border: "1px solid #eee" }}>
        <svg width={width} height={height} role="img" aria-label="Scatter Plot">
          {/* Title */}
          <text x={width / 2} y={24} textAnchor="middle" fontSize="16" fontWeight="600">
            {mainTitle}
          </text>

          {/* Axes */}
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="black" />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="black" />

          {/* X Ticks */}
          {xTicks.map((t, i) => (
            <g key={`xt-${i}`} transform={`translate(${sx(t)}, ${height - pad})`}>
              <line y1="0" y2="6" stroke="black" />
              <text y="20" textAnchor="middle" fontSize="11">
                {t.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Y Ticks */}
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`} transform={`translate(${pad}, ${sy(t)})`}>
              <line x1="-6" x2="0" stroke="black" />
              <text x="-10" textAnchor="end" dy="4" fontSize="11">
                {t.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Grid lines */}
          {xTicks.map((t, i) => (
            <line
              key={`xg-${i}`}
              x1={sx(t)}
              x2={sx(t)}
              y1={pad}
              y2={height - pad}
              stroke="#ddd"
              strokeDasharray="3 3"
            />
          ))}
          {yTicks.map((t, i) => (
            <line
              key={`yg-${i}`}
              y1={sy(t)}
              y2={sy(t)}
              x1={pad}
              x2={width - pad}
              stroke="#ddd"
              strokeDasharray="3 3"
            />
          ))}

          {/* Data points */}
          {data.map((d, i) => (
            <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={pointSize} fill={pointColor} />
          ))}

          {/* Axis Labels */}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="12">
            {xLabel}
          </text>
          <text
            x={16}
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            transform={`rotate(-90, 16, ${height / 2})`}
          >
            {yLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}
