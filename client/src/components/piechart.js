import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Sector
} from "recharts";

const DEFAULT_COLORS = [
  "#4a9eff",
  "#8fbfff",
  "#ffd166",
  "#06d6a0",
  "#ef476f",
  "#ff7b72",
  "#f4a261",
  "#2ec4b6"
];

const renderSlice = (props) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload
  } = props;
  const explodeRatio = Math.max(0, Math.min(1, payload?.explode ?? 0));
  const midAngle = (startAngle + endAngle) / 2;
  const rad = Math.PI / 180;
  const offset = explodeRatio * 30;
  const dx = Math.cos(-midAngle * rad) * offset;
  const dy = Math.sin(-midAngle * rad) * offset;

  return (
    <g transform={`translate(${dx}, ${dy})`}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
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
    .filter((value) => value.length > 0)
    .map((value) => Number(value))
    .filter(Number.isFinite);

const buildChartData = (labelList, valueList, colorList, explodeList) => {
  if (!labelList.length || !valueList.length || labelList.length !== valueList.length) {
    return { error: "Labels and values must be comma-separated lists of equal length." };
  }

  if (colorList.length && colorList.length !== valueList.length) {
    return { error: "Provide the same number of colors as labels, or leave colors blank." };
  }

  if (explodeList.length && explodeList.length !== valueList.length) {
    return { error: "Explode values must match the number of slices." };
  }

  const sanitizedColors =
    colorList.length > 0
      ? colorList
      : DEFAULT_COLORS;

  const preparedData = labelList.map((name, index) => ({
    name,
    value: valueList[index],
    color: sanitizedColors[index % sanitizedColors.length],
    explode: explodeList[index] ?? 0
  }));
  return { data: preparedData };
};

export default function PieChartTool({
  dataRows = [],
  categoryColumn = "",
  valueColumn = "",
  defaultTitle = "Pie Chart Example"
} = {}) {
  const [labels, setLabels] = useState("Category A,Category B,Category C,Category D");
  const [values, setValues] = useState("20,35,25,20");
  const [colors, setColors] = useState("tomato,steelblue,goldenrod,seagreen");
  const [mainTitle, setMainTitle] = useState(defaultTitle || "Pie Chart Example");
  const [explode, setExplode] = useState("");
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Boolean(categoryColumn) &&
    Boolean(valueColumn);

  const runR = useCallback(() => {
    const labelList = parseList(labels);
    const valueList = parseNumbers(values);
    const colorList = parseList(colors);
    const explodeList = parseNumbers(explode).map((num) => Math.max(0, num));

    const { data, error: validationError } = buildChartData(labelList, valueList, colorList, explodeList);
    if (validationError) {
      setError(validationError);
      setChartData([]);
      return;
    }

    setChartData(data);
    setError("");
  }, [labels, values, colors, explode]);

  const projectSlices = useMemo(() => {
    if (!usingProjectData) {
      return [];
    }
    const grouped = new Map();
    dataRows.forEach((row) => {
      const key = row?.[categoryColumn];
      const numericValue = Number(row?.[valueColumn]);
      if (key === undefined || key === null) {
        return;
      }
      if (!Number.isFinite(numericValue)) {
        return;
      }
      grouped.set(key, (grouped.get(key) || 0) + numericValue);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [dataRows, categoryColumn, valueColumn, usingProjectData]);

  useEffect(() => {
    if (!usingProjectData) {
      runR();
      return;
    }
    setMainTitle(defaultTitle || "Pie Chart Example");
    if (!projectSlices.length) {
      setChartData([]);
      setError("Selected columns do not contain usable category/value data.");
      return;
    }
    const labelList = projectSlices.map((slice) => slice.name);
    const valueList = projectSlices.map((slice) => slice.value);
    setLabels(labelList.join(","));
    setValues(valueList.join(","));
    const { data, error: validationError } = buildChartData(labelList, valueList, [], []);
    if (validationError) {
      setChartData([]);
      setError(validationError);
      return;
    }
    setChartData(data);
    setError("");
  }, [usingProjectData, projectSlices, defaultTitle, runR]);

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
          throw new Error("CSV must provide at least two columns (label,value).");
        }

        const firstDataRow = rows[0];
        const hasHeader =
          firstDataRow.length >= 2 &&
          (isNaN(Number(firstDataRow[1])) ||
            (!firstDataRow[0] || Number.isNaN(Number(firstDataRow[0]))));

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
          .filter(
            (entry) =>
              entry.label.length > 0 && Number.isFinite(entry.value)
          );

        if (!processed.length) {
          throw new Error("No valid label/value pairs detected in the CSV.");
        }

        setLabels(processed.map((entry) => entry.label).join(","));
        setValues(processed.map((entry) => entry.value).join(","));
        const colorCandidates = processed
          .map((entry) => entry.color)
          .filter(Boolean);
        setColors(colorCandidates.length ? colorCandidates.join(",") : "");
        setCsvFileName(file.name);
        setError("");
      } catch (err) {
        setError(err.message || "Unable to parse CSV file.");
      }
    };

    reader.onerror = () => {
      setError("Failed to read CSV file.");
    };

    reader.readAsText(file);
  };

  const hasChart = chartData.length > 0;
  const totalValue = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.value, 0),
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
      <h1>R Pie Chart</h1>
      {usingProjectData ? (
        <p>
          Using <strong>{categoryColumn}</strong> vs <strong>{valueColumn}</strong> from the imported dataset.
        </p>
      ) : (
        <p>Configure slice labels, values, and optional colors to generate a pie chart.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {!usingProjectData && (
          <div style={panelStyle}>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Import CSV (Label,Value[,Color])</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                style={inputStyle}
              />
            </label>
            {csvFileName && (
              <p style={{ margin: 0, color: "#9fb3d8" }}>
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
              <span style={labelTextStyle}>Colors (optional)</span>
              <input
                placeholder="e.g. tomato,steelblue,goldenrod"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldWrapperStyle}>
              <span style={labelTextStyle}>Explode (optional, 0-1 per slice)</span>
              <input
                placeholder="e.g. 0,0.1,0,0"
                value={explode}
                onChange={(e) => setExplode(e.target.value)}
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
            <h2 style={{ marginBottom: 12 }}>{mainTitle || "Pie Chart"}</h2>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  innerRadius={40}
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  isAnimationActive={false}
                  shape={renderSlice}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f1b2b" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}`, `${name}`]}
                  contentStyle={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", color: "#111827" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p style={{ marginTop: 12, color: "#4b5563" }}>
              Total value: <strong>{totalValue}</strong>
            </p>
          </>
        ) : (
          <p style={{ color: "#4b5563" }}>Adjust the slice details above to see a live preview.</p>
        )}
      </div>
    </div>
  );
}
