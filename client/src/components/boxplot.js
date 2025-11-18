import { useState, useMemo } from "react";

export default function BoxplotTool() {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [groups, setGroups] = useState("");
  const [mainTitle, setMainTitle] = useState("Boxplot Example");
  const [xLabel, setXLabel] = useState("Group");
  const [yLabel, setYLabel] = useState("Values");
  const [fillColor, setFillColor] = useState("lightblue");
  const [showNotch, setShowNotch] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [error, setError] = useState("");

  // CSV / preview state
  const [csvFileName, setCsvFileName] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]); // array of rows
  const [csvRows, setCsvRows] = useState([]); // full parsed rows
  const [csvColumns, setCsvColumns] = useState([]); // column headers or indices
  const [valueColumn, setValueColumn] = useState(null); // index of column to use as values
  const [groupColumn, setGroupColumn] = useState(null); // index of column to use as groups (optional)
  const [autoGenerateOnUpload, setAutoGenerateOnUpload] = useState(false);

  const MAX_PREVIEW_ROWS = 20;

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

  const runR = async () => {
    const numericValues = parseNumbers(values);
    if (!numericValues.length) {
      setError("Please provide at least one numeric value.");
      setImgSrc("");
      return;
    }

    const groupValues = parseGroups(groups);
    if (groupValues.length && groupValues.length !== numericValues.length) {
      setError("Groups (if provided) must match the number of values.");
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
          groups: groupValues.length ? groupValues : null,
          mainTitle,
          xLabel,
          yLabel,
          fillColor,
          showNotch
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
      setError(err.message || "Unable to generate boxplot.");
    }
  };

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
        setValueColumn(suggestedValueCol);
        setGroupColumn(null);

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
    if (!csvRows.length) return;
    const hasHeader = csvColumns.length && csvRows.length && (csvColumns[0] !== `Col 1`);
    const dataRows = hasHeader ? csvRows.slice(1) : csvRows;
    const vals = dataRows.map(r => r[valColIdx]).map(v => (v||'').trim()).filter(v => v !== '');
    setValues(vals.join(','));
    if (grpColIdx !== null) {
      const gr = dataRows.map(r => (r[grpColIdx]||'').trim()).filter(v => v !== '');
      setGroups(gr.join(','));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Boxplot</h1>
      <p>
        Enter numeric values separated by commas. Optionally supply matching group labels to
        create grouped boxplots.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {/* CSV Upload */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            Upload CSV file (supports comma, semicolon, tab). First two columns are suggested as Value/Group.
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
                  onChange={(e) => { const idx = e.target.value === '' ? null : Number(e.target.value); setValueColumn(idx); applyColumnSelection(idx, groupColumn); }}
                  style={{ marginLeft: 8 }}
                >
                  {csvColumns.map((c, i) => (
                    <option key={i} value={i}>{c}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "block", marginBottom: 6 }}>
                Group column (optional)
                <select
                  value={groupColumn ?? ''}
                  onChange={(e) => { const idx = e.target.value === '' ? null : Number(e.target.value); setGroupColumn(idx); applyColumnSelection(valueColumn, idx); }}
                  style={{ marginLeft: 8 }}
                >
                  <option value="">(none)</option>
                  {csvColumns.map((c, i) => (
                    <option key={i} value={i}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Preview table */}
          {csvPreview.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8, background: '#fafafa' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {csvPreview.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: 6, fontSize: 12, borderRight: '1px solid #f5f5f5' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvPreview.length === MAX_PREVIEW_ROWS && <div style={{ fontSize: 11, marginTop: 6 }}>Showing first {MAX_PREVIEW_ROWS} rows</div>}
            </div>
          )}
        </div>

        <label>
          Values
          <input value={values} onChange={(e) => setValues(e.target.value)} />
        </label>
        <label>
          Groups (optional)
          <input
            placeholder="e.g. A,A,A,B,B,B"
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <label>
            Title
            <input value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} />
          </label>
          <label>
            X Label
            <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} />
          </label>
          <label>
            Y Label
            <input value={yLabel} onChange={(e) => setYLabel(e.target.value)} />
          </label>
          <label>
            Fill Color
            <input value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={showNotch}
              onChange={(e) => setShowNotch(e.target.checked)}
            />
            Notched
          </label>
        </div>

        <button onClick={runR}>Generate</button>
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
            alt="R Boxplot"
            style={{ maxWidth: "100%", border: "1px solid #eee" }}
          />
        </div>
      )}
    </div>
  );
}
