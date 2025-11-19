import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip
} from "recharts";

export default function HistogramTool() {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [breaks, setBreaks] = useState(5);
  const [csvFile, setCsvFile] = useState(null);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]);

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
            .filter(line => line) // Remove empty lines
            .map(line => line.split(','))
            .flat() // Flatten the array since we only need one column
            .filter(value => !isNaN(value.trim())); // Keep only numeric values
          
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
  const [mainTitle, setMainTitle] = useState("Histogram Example");
  const [xLabel, setXLabel] = useState("Values");
  const [color, setColor] = useState("darkorange");
  const parseNumbers = (input) =>
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);

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

  const runR = async () => {
    const numericValues = parseNumbers(values);
    if (!numericValues.length) {
      setError("Please provide at least one numeric value.");
      setChartData([]);
      return;
    }
    const data = buildHistogramData(numericValues, breaks);
    setChartData(data);
    setError("");
  };

  const totalCount = useMemo(
    () => chartData.reduce((sum, bin) => sum + bin.count, 0),
    [chartData]
  );

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Histogram</h1>
      <p>Enter values as comma-separated numbers or upload a CSV file.</p>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Upload CSV file
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ marginLeft: 8 }}
            />
          </label>
          {csvFile && <p style={{ margin: "4px 0", fontSize: "0.9em", color: "green" }}>Loaded: {csvFile}</p>}
          {error && <p style={{ margin: "4px 0", fontSize: "0.9em", color: "crimson" }}>{error}</p>}
        </div>
        <input value={values} onChange={e=>setValues(e.target.value)} />
        <div style={{ display: "flex", gap: 12 }}>
          <label>Breaks: <input type="number" min={1} value={breaks} onChange={e=>setBreaks(+e.target.value)} /></label>
          <label>Title: <input value={mainTitle} onChange={e=>setMainTitle(e.target.value)} /></label>
          <label>X Label: <input value={xLabel} onChange={e=>setXLabel(e.target.value)} /></label>
          <label>Color: <input value={color} onChange={e=>setColor(e.target.value)} /></label>
        </div>
        <button onClick={runR}>Generate</button>
      </div>

      <div style={{ marginTop: 24, background: "#090f1a", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
        {chartData.length ? (
          <>
            <h2 style={{ marginBottom: 12 }}>{mainTitle}</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fill: "#b8c7e0", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#b8c7e0" }} />
                <Tooltip
                  contentStyle={{ background: "#0f1b2b", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill={color} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ marginTop: 12, color: "#9fb3d8" }}>
              Total observations: <strong>{totalCount}</strong>
            </p>
            <p style={{ marginTop: 4, color: "#9fb3d8" }}>{xLabel}</p>
          </>
        ) : (
          <p style={{ color: "#9fb3d8" }}>Click Generate after importing or entering values to view the histogram.</p>
        )}
      </div>
    </div>
  );
}
