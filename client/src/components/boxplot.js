import { useCallback, useEffect, useMemo, useState } from "react";

export default function BoxplotTool({
  dataRows = [],
  valueColumn = "",
  groupColumn = "",
  defaultTitle = "Boxplot Example"
} = {}) {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [groups, setGroups] = useState("");
  const [mainTitle, setMainTitle] = useState(defaultTitle || "Boxplot Example");
  const [xLabel, setXLabel] = useState("Group");
  const [yLabel, setYLabel] = useState("Values");
  const [fillColor, setFillColor] = useState("lightblue");
  const [showNotch, setShowNotch] = useState(false);
  const [boxplotData, setBoxplotData] = useState([]);
  const [error, setError] = useState("");

  // CSV / preview state
  const [csvFileName, setCsvFileName] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]); // array of rows
  const [csvRows, setCsvRows] = useState([]); // full parsed rows
  const [csvColumns, setCsvColumns] = useState([]); // column headers or indices
  const [valueColumnIndex, setValueColumnIndex] = useState(null); // index of column to use as values
  const [groupColumnIndex, setGroupColumnIndex] = useState(null); // index of column to use as groups (optional)
  const [autoGenerateOnUpload, setAutoGenerateOnUpload] = useState(false);

  const MAX_PREVIEW_ROWS = 20;

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

  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Boolean(valueColumn);

  const { projectValues, projectGroups } = useMemo(() => {
    if (!usingProjectData) {
      return { projectValues: [], projectGroups: [] };
    }
    const valuesList = [];
    const groupsList = [];
    dataRows.forEach((row) => {
      const numericValue = Number(row?.[valueColumn]);
      if (!Number.isFinite(numericValue)) {
        return;
      }
      valuesList.push(numericValue);
      if (groupColumn) {
        const rawGroup = row?.[groupColumn];
        const normalized = rawGroup === undefined || rawGroup === null || rawGroup === ""
          ? "Group"
          : String(rawGroup);
        groupsList.push(normalized);
      }
    });
    return { projectValues: valuesList, projectGroups: groupsList };
  }, [dataRows, valueColumn, groupColumn, usingProjectData]);

  const parseNumbers = (input) =>
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);

  const parseGroups = (input) =>
    input
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

  const median = (sortedValues) => {
    const len = sortedValues.length;
    const mid = Math.floor(len / 2);
    if (len % 2 === 0) {
      return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
  };

  const computeStats = (dataValues) => {
    const sorted = [...dataValues].sort((a, b) => a - b);
    const len = sorted.length;
    if (!len) {
      return null;
    }
    const q2 = median(sorted);
    const mid = Math.floor(len / 2);
    const lowerHalf = sorted.slice(0, mid);
    const upperHalf = len % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
    const q1 = lowerHalf.length ? median(lowerHalf) : sorted[0];
    const q3 = upperHalf.length ? median(upperHalf) : sorted[len - 1];
    return {
      min: sorted[0],
      max: sorted[len - 1],
      q1,
      q3,
      median: q2
    };
  };

  const prepareBoxplotData = (numericValues, groupValues) => {
    if (!numericValues.length) {
      return { error: "Please provide at least one numeric value." };
    }

    if (groupValues.length && groupValues.length !== numericValues.length) {
      return { error: "Groups (if provided) must match the number of values." };
    }

    const grouped = {};
    if (groupValues.length) {
      groupValues.forEach((groupLabel, index) => {
        if (!grouped[groupLabel]) {
          grouped[groupLabel] = [];
        }
        grouped[groupLabel].push(numericValues[index]);
      });
    } else {
      grouped["Sample"] = numericValues;
    }

    const computedData = Object.entries(grouped)
      .map(([groupLabel, dataValues]) => {
        const stats = computeStats(dataValues);
        return stats
          ? { label: groupLabel, ...stats }
          : null;
      })
      .filter(Boolean);

    if (!computedData.length) {
      return { error: "Unable to compute box plot statistics." };
    }

    return { data: computedData };
  };

  const runR = useCallback(() => {
    if (usingProjectData) {
      if (!projectValues.length) {
        setError("Selected column has no numeric values.");
        setBoxplotData([]);
        return;
      }
      const groupValues = groupColumn ? projectGroups : [];
      const { data, error: validationError } = prepareBoxplotData(projectValues, groupValues);
      if (validationError) {
        setError(validationError);
        setBoxplotData([]);
        return;
      }
      setBoxplotData(data);
      setError("");
      return;
    }

    const numericValues = parseNumbers(values);
    const groupValues = parseGroups(groups);
    const { data, error: validationError } = prepareBoxplotData(numericValues, groupValues);
    if (validationError) {
      setError(validationError);
      setBoxplotData([]);
      return;
    }
    setBoxplotData(data);
    setError("");
  }, [usingProjectData, projectValues, projectGroups, groupColumn, values, groups]);

  useEffect(() => {
    if (!usingProjectData) {
      return;
    }
    setMainTitle(defaultTitle || "Boxplot Example");
    setXLabel(groupColumn || "Group");
    setYLabel(valueColumn || "Values");
    if (!projectValues.length) {
      setBoxplotData([]);
      setError("Selected column has no numeric values.");
      return;
    }
    const groupValues = groupColumn ? projectGroups : [];
    setValues(projectValues.join(","));
    setGroups(groupValues.length ? groupValues.join(",") : "");
    const { data, error: validationError } = prepareBoxplotData(projectValues, groupValues);
    if (validationError) {
      setBoxplotData([]);
      setError(validationError);
      return;
    }
    setBoxplotData(data);
    setError("");
  }, [usingProjectData, projectValues, projectGroups, groupColumn, valueColumn, defaultTitle]);

  useEffect(() => {
    if (usingProjectData) {
      return;
    }
    runR();
  }, [usingProjectData, runR]);

  // --- CSV parsing utilities (delimiter detection + RFC4180-like parser)
  function detectDelimiter(sampleText) {
    const candidates = [",", ";", "\t"];
    const lines = sampleText.split(/\r?\n/).slice(0, 10).filter(Boolean);
    let best = ",";
    let bestCols = 0;
    for (const d of candidates) {
      const counts = lines.map(l => l.split(d).length);
      const median = counts.sort((a,b)=>a-b)[Math.floor(counts.length/2)] || 0;
      if (median > bestCols) { bestCols = median; best = d; }
    }
    return best;
  }

  function parseCsvText(text, delimiter) {
    // simple parser handling quoted fields with double quotes and escaped quotes ""
    const rows = [];
    let i = 0, cur = '', row = [], inQuotes = false;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i+1] === '"') { cur += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cur += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); cur = ''; row = []; i++; continue; }
      if (ch === delimiter) { row.push(cur); cur = ''; i++; continue; }
      cur += ch; i++;
    }
    // push last
    if (inQuotes) throw new Error('Unterminated quoted field in CSV');
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const delimiter = detectDelimiter(text);
        const rows = parseCsvText(text, delimiter).filter(r => r.length > 0);
        if (!rows.length) throw new Error('CSV is empty');

        // detect header: if first row has any non-numeric in first two columns
        const first = rows[0];
        const hasHeader = (first[0] && isNaN(Number(first[0]))) || (first[1] && isNaN(Number(first[1])));
        const dataRows = hasHeader ? rows.slice(1) : rows;
        if (!dataRows.length) throw new Error('CSV has header but no data rows');

        // build columns list
  const cols = (hasHeader ? first : rows[0]).map((c, idx) => (c && c.trim()) ? c.trim() : `Col ${idx+1}`);
  setCsvColumns(cols);
  setCsvRows(rows);
  setCsvPreview(rows.slice(0, MAX_PREVIEW_ROWS));
        setCsvFileName(file.name);
        setError("");

        // auto-select value/group columns if possible
        // choose first numeric column for values
        const numericColIndexes = (dataRows[0] || []).map((_, colIdx) => {
          const sample = dataRows.slice(0, Math.min(8, dataRows.length));
          const allNumeric = sample.every(r => !isNaN(Number(r[colIdx])));
          return allNumeric ? colIdx : null;
        }).filter(i => i !== null);

        const suggestedValueCol = numericColIndexes.length ? numericColIndexes[0] : 0;
        setValueColumnIndex(suggestedValueCol);
        setGroupColumnIndex(null);

        // If auto-generate is enabled, fill values/groups and run
        if (autoGenerateOnUpload) {
          const vals = dataRows.map(r => r[suggestedValueCol]).map(v => (v||'').trim()).filter(v => v !== "");
          setValues(vals.join(','));
          // if there is another numeric column, don't auto-assign as group; groups are usually categorical
          setTimeout(() => runR(), 50);
        }
      } catch (err) {
        setError('CSV error: ' + err.message);
        setCsvPreview([]);
        setCsvColumns([]);
        setCsvFileName(null);
      }
    };
    reader.onerror = () => setError('Error reading file');
    reader.readAsText(file);
  };

  // helper to extract columns when user picks them from UI
  const applyColumnSelection = (valColIdx, grpColIdx) => {
    if (!csvRows.length || valColIdx === null || valColIdx === undefined) return;
    const hasHeader = csvColumns.length && csvRows.length && (csvColumns[0] !== `Col 1`);
    const dataRows = hasHeader ? csvRows.slice(1) : csvRows;
    const vals = dataRows.map(r => r[valColIdx]).map(v => (v||'').trim()).filter(v => v !== '');
    setValues(vals.join(','));
    if (grpColIdx !== null && grpColIdx !== undefined) {
      const gr = dataRows.map(r => (r[grpColIdx]||'').trim()).filter(v => v !== '');
      setGroups(gr.join(','));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Boxplot</h1>
      {usingProjectData ? (
        <p style={{ marginBottom: "20px", color: "lightgray" }}>
          Using <strong>{valueColumn}</strong>
          {groupColumn ? (
            <> grouped by <strong>{groupColumn}</strong></>
          ) : null} from the imported dataset.
        </p>
      ) : (
        <p>
          Enter numeric values separated by commas. Optionally supply matching group labels to
          create grouped boxplots.
        </p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>
                Upload CSV file (supports comma, semicolon, tab). First two columns are suggested as Value/Group.
              </span>
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
              <>
                <label style={fieldWrapperStyle}>
                  <span style={labelTextStyle}>Value column</span>
                  <select
                    value={valueColumnIndex ?? ""}
                    onChange={(e) => {
                      const idx = e.target.value === "" ? null : Number(e.target.value);
                      setValueColumnIndex(idx);
                      applyColumnSelection(idx, groupColumnIndex);
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
                <label style={fieldWrapperStyle}>
                  <span style={labelTextStyle}>Group column (optional)</span>
                  <select
                    value={groupColumnIndex ?? ""}
                    onChange={(e) => {
                      const idx = e.target.value === "" ? null : Number(e.target.value);
                      setGroupColumnIndex(idx);
                      applyColumnSelection(valueColumnIndex, idx);
                    }}
                    style={inputStyle}
                  >
                    <option value="">(none)</option>
                    {csvColumns.map((c, i) => (
                      <option key={i} value={i}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Values</span>
              <input value={values} onChange={(e) => setValues(e.target.value)} style={inputStyle} />
            </label>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Groups (optional)</span>
              <input
                placeholder="e.g. A,A,A,B,B,B"
                value={groups}
                onChange={(e) => setGroups(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        )}

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
            <span style={labelTextStyle}>Fill Color</span>
            <input value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ ...fieldWrapperStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={showNotch}
              onChange={(e) => setShowNotch(e.target.checked)}
            />
            <span style={labelTextStyle}>Notched</span>
          </label>
        </div>

      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #eee" }}>
        <h2 style={{ marginBottom: 12 }}>{mainTitle}</h2>
        {boxplotData.length ? (
          <svg width="100%" height="320" viewBox="0 0 720 320">
            {(() => {
              const paddingX = 60;
              const paddingY = 50;
              const width = 720;
              const height = 320;
              const chartWidth = width - paddingX * 2;
              const chartHeight = height - paddingY * 2;
              const minValue = Math.min(...boxplotData.map(d => d.min));
              const maxValue = Math.max(...boxplotData.map(d => d.max));
              const range = maxValue - minValue || 1;
              const scaleY = (value) =>
                height - paddingY - ((value - minValue) / range) * chartHeight;
              const spacing = chartWidth / boxplotData.length;
              const boxWidth = Math.min(60, spacing * 0.6);
              const tickCount = 5;
              const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => minValue + (range * i) / tickCount);

              return (
                <>
                  {/* Horizontal grid and numeric axis labels */}
                  {tickValues.map((tick) => {
                    const y = scaleY(tick);
                    return (
                      <g key={`tick-${tick}`}>
                        <line
                          x1={paddingX - 10}
                          x2={width - paddingX}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingX - 18}
                          y={y + 4}
                          textAnchor="end"
                          fill="#4b5563"
                          fontSize="12"
                        >
                          {Math.abs(tick) < 1e-6 ? "0" : Number.isInteger(tick) ? tick : tick.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Horizontal axis labels */}
                  {boxplotData.map((entry, index) => {
                    const centerX = paddingX + spacing * index + spacing / 2;
                    const minY = scaleY(entry.min);
                    const maxY = scaleY(entry.max);
                    const q1Y = scaleY(entry.q1);
                    const q3Y = scaleY(entry.q3);
                    const medianY = scaleY(entry.median);
                    const leftX = centerX - boxWidth / 2;
                    const rightX = centerX + boxWidth / 2;
                    const notchWidth = boxWidth * 0.4;
                    const notchLeft = centerX - notchWidth / 2;
                    const notchRight = centerX + notchWidth / 2;
                    const notchDepth = 8;

                    return (
                      <g key={entry.label}>
                        {/* Whisker lines */}
                        <line
                          x1={centerX}
                          x2={centerX}
                          y1={maxY}
                          y2={q3Y}
                          stroke="#94a3b8"
                          strokeWidth="2"
                        />
                        <line
                          x1={centerX}
                          x2={centerX}
                          y1={minY}
                          y2={q1Y}
                          stroke="#94a3b8"
                          strokeWidth="2"
                        />
                        {/* Min/Max caps */}
                        <line
                          x1={centerX - boxWidth / 4}
                          x2={centerX + boxWidth / 4}
                          y1={maxY}
                          y2={maxY}
                          stroke="#94a3b8"
                          strokeWidth="2"
                        />
                        <line
                          x1={centerX - boxWidth / 4}
                          x2={centerX + boxWidth / 4}
                          y1={minY}
                          y2={minY}
                          stroke="#94a3b8"
                          strokeWidth="2"
                        />
                        {/* Box */}
                        <rect
                          x={leftX}
                          y={q3Y}
                          width={boxWidth}
                          height={q1Y - q3Y}
                          fill={fillColor}
                          opacity="0.6"
                          stroke="#cbd5f5"
                          strokeWidth="2"
                        />
                        {/* Notch */}
                        {showNotch && (
                          <path
                            d={`M ${leftX} ${q3Y}
                                L ${notchLeft} ${medianY - notchDepth}
                                L ${notchLeft} ${medianY + notchDepth}
                                L ${leftX} ${q1Y}
                                L ${rightX} ${q1Y}
                                L ${notchRight} ${medianY + notchDepth}
                                L ${notchRight} ${medianY - notchDepth}
                                L ${rightX} ${q3Y}
                                Z`}
                            fill={fillColor}
                            opacity="0.85"
                          />
                        )}
                        {/* Median line */}
                        <line
                          x1={leftX}
                          x2={rightX}
                          y1={medianY}
                          y2={medianY}
                          stroke="#1f2933"
                          strokeWidth="3"
                        />
                        {/* Labels */}
                        <text
                          x={centerX}
                          y={height - paddingY / 2}
                          textAnchor="middle"
                          fill="#4b5563"
                        >
                          {entry.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Y axis label */}
                  <text
                    x={20}
                    y={height / 2}
                    fill="#4b5563"
                    transform={`rotate(-90, 20, ${height / 2})`}
                    textAnchor="middle"
                  >
                    {yLabel}
                  </text>
                </>
              );
            })()}
          </svg>
        ) : (
          <p style={{ color: "#4b5563" }}>Adjust the inputs above to update the boxplot preview.</p>
        )}
      </div>
    </div>
  );
}
