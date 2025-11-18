import { useState } from "react";

export default function HistogramTool() {
  const [values, setValues] = useState("5,7,8,9,10,12,13,15,16,18,20");
  const [breaks, setBreaks] = useState(5);
  const [csvFile, setCsvFile] = useState(null);
  const [error, setError] = useState("");

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
  const [imgSrc, setImgSrc] = useState("");

  const runR = async () => {
    const payload = {
      breaks,
      mainTitle,
      xLabel,
      color,
      values: values.split(",").map(v => Number(v.trim())).filter(Number.isFinite)
    };
    const res = await fetch("/api/run-r", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.imageBase64) setImgSrc(`data:image/png;base64,${data.imageBase64}`);
    else console.error(data);
  };

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

      {imgSrc && (
        <div style={{ marginTop: 16 }}>
          <img src={imgSrc} alt="R Histogram" style={{ maxWidth: "100%", border: "1px solid #eee" }} />
        </div>
      )}
    </div>
  );
}

