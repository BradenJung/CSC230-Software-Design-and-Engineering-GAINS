import { useState } from "react";

export default function PieChartTool() {
  const [labels, setLabels] = useState("Category A,Category B,Category C,Category D");
  const [values, setValues] = useState("20,35,25,20");
  const [colors, setColors] = useState("tomato,steelblue,goldenrod,seagreen");
  const [mainTitle, setMainTitle] = useState("Pie Chart Example");
  const [explode, setExplode] = useState("");
  const [imgSrc, setImgSrc] = useState("");
  const [error, setError] = useState("");

  const parseList = (input) =>
    input
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

  const parseNumbers = (input) =>
    input
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);

  const runR = async () => {
    const labelList = parseList(labels);
    const valueList = parseNumbers(values);
    const colorList = parseList(colors);
    const explodeList = parseNumbers(explode).map((num) => Math.max(0, num));

    if (!labelList.length || !valueList.length || labelList.length !== valueList.length) {
      setError("Labels and values must be comma-separated lists of equal length.");
      setImgSrc("");
      return;
    }

    if (colorList.length && colorList.length !== valueList.length) {
      setError("Provide the same number of colors as labels, or leave colors blank.");
      setImgSrc("");
      return;
    }

    if (explodeList.length && explodeList.length !== valueList.length) {
      setError("Explode values must match the number of slices.");
      setImgSrc("");
      return;
    }

    setError("");

    try {
      const res = await fetch("/api/run-r", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labels: labelList,
          values: valueList,
          colors: colorList.length ? colorList : null,
          explode: explodeList.length ? explodeList : null,
          mainTitle
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
      setError(err.message || "Unable to generate pie chart.");
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>R Pie Chart</h1>
      <p>Configure slice labels, values, and optional colors to generate a pie chart.</p>

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          Labels
          <input value={labels} onChange={(e) => setLabels(e.target.value)} />
        </label>
        <label>
          Values
          <input value={values} onChange={(e) => setValues(e.target.value)} />
        </label>
        <label>
          Colors (optional)
          <input
            placeholder="e.g. tomato,steelblue,goldenrod"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
          />
        </label>
        <label>
          Explode (optional, 0-1 per slice)
          <input
            placeholder="e.g. 0,0.1,0,0"
            value={explode}
            onChange={(e) => setExplode(e.target.value)}
          />
        </label>
        <label>
          Title
          <input value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} />
        </label>

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
            alt="R Pie Chart"
            style={{ maxWidth: "100%", border: "1px solid #eee" }}
          />
        </div>
      )}
    </div>
  );
}
