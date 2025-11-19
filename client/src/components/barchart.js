import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from "recharts";

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

const parseList = (input = "") =>
  input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const parseNumbers = (input = "") =>
  input
    .split(",")
    .map((value) => value.trim())
    .map((value) => Number(value))
    .filter(Number.isFinite);

export default function BarChartTool({
  dataRows = [],
  categoryColumn = "",
  valueColumn = "",
  defaultTitle = "Bar Chart Example"
} = {}) {
  const [labels, setLabels] = useState("Category A,Category B,Category C,Category D");
  const [values, setValues] = useState("10,22,18,30");
  const [colorOverrides, setColorOverrides] = useState("");
  const [barColor, setBarColor] = useState("#4a9eff");
  const [mainTitle, setMainTitle] = useState(defaultTitle || "Bar Chart Example");
  const [xLabel, setXLabel] = useState("Category");
  const [yLabel, setYLabel] = useState("Values");
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");

  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Boolean(categoryColumn) &&
    Boolean(valueColumn);

  const buildChartData = useCallback(
    (labelList, valueList, colorList) => {
      if (!labelList.length || !valueList.length || labelList.length !== valueList.length) {
        return { error: "Labels and values must be comma-separated lists of equal length." };
      }

      if (colorList.length && colorList.length !== valueList.length) {
        return { error: "Provide the same number of colors as categories, or leave colors blank." };
      }

      const prepared = labelList.map((name, index) => ({
        name,
        value: valueList[index],
        color: colorList.length ? colorList[index] : barColor
      }));

      return { data: prepared };
    },
    [barColor]
  );

  const updateManualChart = useCallback(() => {
    const labelList = parseList(labels);
    const valueList = parseNumbers(values);
    const colorList = parseList(colorOverrides);
    const { data, error: validationError } = buildChartData(labelList, valueList, colorList);
    if (validationError) {
      setChartData([]);
      setError(validationError);
      return;
    }
    setChartData(data);
    setError("");
  }, [labels, values, colorOverrides, buildChartData]);

  const projectBars = useMemo(() => {
    if (!usingProjectData) {
      return [];
    }
    const grouped = new Map();
    dataRows.forEach((row) => {
      const key = row?.[categoryColumn];
      const numericValue = Number(row?.[valueColumn]);
      if (!key && key !== 0) {
        return;
      }
      if (!Number.isFinite(numericValue)) {
        return;
      }
      grouped.set(String(key), (grouped.get(String(key)) || 0) + numericValue);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [dataRows, categoryColumn, valueColumn, usingProjectData]);

  useEffect(() => {
    if (usingProjectData) {
      return;
    }
    updateManualChart();
  }, [usingProjectData, updateManualChart]);

  useEffect(() => {
    if (!usingProjectData) {
      return;
    }
    setMainTitle(defaultTitle || "Bar Chart Example");
    setXLabel(categoryColumn || "Category");
    setYLabel(valueColumn || "Values");
    if (!projectBars.length) {
      setChartData([]);
      setError("Selected columns do not contain usable category/value data.");
      return;
    }
    const labelList = projectBars.map((entry) => entry.name);
    const valueList = projectBars.map((entry) => entry.value);
    const { data, error: validationError } = buildChartData(labelList, valueList, []);
    if (validationError) {
      setChartData([]);
      setError(validationError);
      return;
    }
    setChartData(data);
    setError("");
  }, [usingProjectData, projectBars, buildChartData, categoryColumn, valueColumn, defaultTitle]);

  const handleCsvUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        const rows = String(text || "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(","));
        if (!rows.length || rows[0].length < 2) {
          throw new Error("CSV must include at least two columns (label,value).");
        }

        const firstRow = rows[0];
        const hasHeader =
          firstRow.length >= 2 &&
          (isNaN(Number(firstRow[1])) || (!firstRow[0] || Number.isNaN(Number(firstRow[0]))));
        const dataRows = hasHeader ? rows.slice(1) : rows;
        const processed = dataRows
          .map((row) => {
            const [rawLabel = "", rawValue = "", rawColor = ""] = row;
            return {
              label: rawLabel.trim(),
              value: Number(rawValue.trim()),
              color: rawColor.trim()
            };
          })
          .filter((entry) => entry.label.length > 0 && Number.isFinite(entry.value));
        if (!processed.length) {
          throw new Error("No valid label/value pairs detected in the CSV.");
        }
        setLabels(processed.map((entry) => entry.label).join(","));
        setValues(processed.map((entry) => entry.value).join(","));
        const colorCandidates = processed.map((entry) => entry.color).filter(Boolean);
        setColorOverrides(colorCandidates.length ? colorCandidates.join(",") : "");
        setCsvFileName(file.name);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to parse CSV file.");
      }
    };
    reader.onerror = () => setError("Failed to read CSV file.");
    reader.readAsText(file);
  };

  const hasChart = chartData.length > 0;
  const totalValue = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.value, 0),
    [chartData]
  );

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Bar Chart</h1>
      {usingProjectData ? (
        <p>
          Using <strong>{categoryColumn}</strong> vs <strong>{valueColumn}</strong> from the imported dataset.
        </p>
      ) : (
        <p>Enter categories and values, or upload a CSV, to preview the bar chart.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Import CSV (Label,Value[,Color])</span>
              <input type="file" accept=".csv" onChange={handleCsvUpload} style={inputStyle} />
            </label>
            {csvFileName && (
              <p style={{ margin: 0, color: "#4b5563" }}>
                Loaded: {csvFileName}
              </p>
            )}
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Labels</span>
              <input value={labels} onChange={(e) => setLabels(e.target.value)} style={inputStyle} />
            </label>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Values</span>
              <input value={values} onChange={(e) => setValues(e.target.value)} style={inputStyle} />
            </label>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Colors (optional, comma-separated)</span>
              <input
                placeholder="e.g. #4a9eff,#ef476f"
                value={colorOverrides}
                onChange={(e) => setColorOverrides(e.target.value)}
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
            <span style={labelTextStyle}>Default Bar Color</span>
            <input value={barColor} onChange={(e) => setBarColor(e.target.value)} style={inputStyle} />
          </label>
        </div>
      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #eee" }}>
        {hasChart ? (
          <>
            <h2 style={{ marginBottom: 12 }}>{mainTitle}</h2>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                  label={{ value: xLabel, position: "insideBottom", offset: -4, fill: "#4b5563" }}
                />
                <YAxis
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                  label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#4b5563" }}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}`, name]}
                  contentStyle={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", color: "#111827" }}
                />
                <Bar dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={{ marginTop: 12, color: "#4b5563" }}>
              Total value: <strong>{totalValue}</strong>
            </p>
          </>
        ) : (
          <p style={{ color: "#4b5563" }}>Adjust the categories and values above to preview the bar chart.</p>
        )}
      </div>
    </div>
  );
}
