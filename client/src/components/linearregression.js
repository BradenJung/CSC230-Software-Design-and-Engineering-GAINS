import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line
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
  gap: 6
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

// Match the light chart treatment used by scatterplot.js
const chartTheme = {
  grid: "#ddd",
  axis: "#111",
  tooltipBg: "#fff",
  tooltipBorder: "1px solid #eee",
  tooltipText: "#111",
  dot: "#4a9eff",
  line: "#ef4444",
  surface: "#fff",
  surfaceBorder: "#eee"
};

const parseNumbers = (input = "") =>
  input
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Number.isFinite);

// Basic matrix utilities for small datasets
const transpose = (matrix) => matrix[0].map((_, col) => matrix.map((row) => row[col]));

const multiply = (a, b) => {
  const result = Array.from({ length: a.length }, () => Array(b[0].length).fill(0));
  for (let i = 0; i < a.length; i += 1) {
    for (let k = 0; k < b.length; k += 1) {
      for (let j = 0; j < b[0].length; j += 1) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
};

const invert = (matrix) => {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let i = 0; i < n; i += 1) {
    let pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-12) {
      const swapRow = aug.findIndex((row, r) => r > i && Math.abs(row[i]) > 1e-12);
      if (swapRow === -1) {
        return null;
      }
      [aug[i], aug[swapRow]] = [aug[swapRow], aug[i]];
      pivot = aug[i][i];
    }
    const factor = pivot;
    for (let j = 0; j < 2 * n; j += 1) {
      aug[i][j] /= factor;
    }
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const f = aug[r][i];
      for (let c = 0; c < 2 * n; c += 1) {
        aug[r][c] -= f * aug[i][c];
      }
    }
  }

  return aug.map((row) => row.slice(n));
};

const dot = (a, b) => a.reduce((sum, val, idx) => sum + val * b[idx], 0);

const computeSimpleRegression = (rows = []) => {
  if (!rows.length || !rows[0].x.length) return null;
  const points = rows
    .map(({ x, y }) => ({ x: x[0], y }))
    .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  points.forEach(({ x, y }) => {
    const dx = x - meanX;
    const dy = y - meanY;
    num += dx * dy;
    den += dx * dx;
  });

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const predictions = points.map(({ x }) => slope * x + intercept);

  let ssTot = 0;
  let ssRes = 0;
  points.forEach(({ y }, idx) => {
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - predictions[idx], 2);
  });
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Align to multi-var format
  const coefficients = [intercept, slope];
  return {
    coefficients,
    predictions,
    r2,
    mapBack: (pred) => pred // identity for predicted vs actual chart
  };
};

const computeRegression = (rows = []) => {
  if (!rows.length) {
    return null;
  }
  const p = rows[0].x.length; // predictors
  const n = rows.length;
  if (p === 0) {
    return null;
  }

  // Build design matrix with intercept
  const X = rows.map(({ x }) => [1, ...x]);
  const y = rows.map(({ y }) => [y]);

  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtXInv = invert(XtX);
  if (!XtXInv) {
    return null;
  }
  const XtY = multiply(Xt, y);
  const beta = multiply(XtXInv, XtY).map((row) => row[0]); // coefficients with intercept first

  const predictions = X.map((row) => dot(row, beta));
  const meanY = y.reduce((sum, val) => sum + val[0], 0) / n;
  const ssTot = y.reduce((sum, val) => sum + Math.pow(val[0] - meanY, 2), 0);
  const ssRes = predictions.reduce((sum, pred, i) => sum + Math.pow(y[i][0] - pred, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { coefficients: beta, predictions, r2 };
};

export default function LinearRegressionPreview({
  dataRows = [],
  responseColumn = "",
  predictorColumns = [],
  defaultTitle = "Linear Regression Preview"
} = {}) {
  const [manualPredictor, setManualPredictor] = useState("1,2,3,4,5,6,7,8");
  const [manualResponse, setManualResponse] = useState("12,14,15,17,19,21,23,25");
  const [title, setTitle] = useState(defaultTitle || "Linear Regression Preview");
  const [error, setError] = useState("");

  const usingProjectData =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    Array.isArray(predictorColumns) &&
    predictorColumns.length > 0 &&
    Boolean(responseColumn);

  useEffect(() => {
    setTitle(defaultTitle || "Linear Regression Preview");
  }, [defaultTitle]);

  const projectRows = useMemo(() => {
    if (!usingProjectData) {
      return [];
    }
    return dataRows
      .map((row) => {
        const yRaw = row?.[responseColumn];
        const y = Number(yRaw);
        const xValues = predictorColumns.map((col) => Number(row?.[col]));
        if (!Number.isFinite(y) || xValues.some((val) => !Number.isFinite(val))) {
          return null;
        }
        return { x: xValues, y };
      })
      .filter(Boolean);
  }, [usingProjectData, dataRows, predictorColumns, responseColumn]);

  const manualRows = useMemo(() => {
    const xs = parseNumbers(manualPredictor);
    const ys = parseNumbers(manualResponse);
    if (!xs.length || xs.length !== ys.length) {
      return [];
    }
    return xs.map((x, index) => ({ x: [x], y: ys[index] }));
  }, [manualPredictor, manualResponse]);

  const rows = usingProjectData ? projectRows : manualRows;
  const regression = useMemo(() => {
    const result = computeRegression(rows);
    if (result) return result;
    return computeSimpleRegression(rows);
  }, [rows]);

  const hasData = rows.length >= 2 && regression;

  useEffect(() => {
    if (usingProjectData && rows.length === 0) {
      setError("Selected columns do not contain numeric values.");
    } else if (usingProjectData && rows.length > 0 && !regression) {
      setError("Unable to compute regression with the selected predictors (try fewer columns).");
    } else {
      setError("");
    }
  }, [usingProjectData, rows.length, regression]);

  const scatterData = useMemo(() => {
    if (!hasData) {
      return [];
    }
    return rows.map((row, index) => ({
      actual: row.y,
      predicted: regression.predictions[index]
    }));
  }, [hasData, rows, regression]);

  const lineData = useMemo(() => {
    if (!hasData || scatterData.length === 0) {
      return [];
    }
    const minVal = Math.min(...scatterData.map((p) => Math.min(p.actual, p.predicted)));
    const maxVal = Math.max(...scatterData.map((p) => Math.max(p.actual, p.predicted)));
    const padding = (maxVal - minVal || 1) * 0.05;
    const low = minVal - padding;
    const high = maxVal + padding;
    return [
      { x: low, y: low },
      { x: high, y: high }
    ];
  }, [hasData, scatterData]);

  const coefficientLabels = useMemo(() => {
    if (!hasData || !regression?.coefficients) return [];
    const [, ...predictorCoeffs] = regression.coefficients;
    return predictorCoeffs.map((coef, index) => ({
      name: predictorColumns[index] || `x${index + 1}`,
      value: coef
    }));
  }, [hasData, regression, predictorColumns]);

  const handleSample = useCallback(() => {
    setManualPredictor("1,2,3,4,5,6,7,8");
    setManualResponse("12,14,15,17,19,21,23,25");
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1>{title}</h1>
      {usingProjectData ? (
        <p style={{ marginBottom: "20px", color: "lightgray" }}>
          Using <strong>{predictorColumns.join(", ")}</strong> to predict <strong>{responseColumn}</strong> from the imported dataset.
        </p>
      ) : (
        <p>Enter paired numeric values (predictor, response) to preview the regression fit.</p>
      )}

      {!usingProjectData && (
        <div style={panelStyle}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ ...fieldWrapperStyle, flex: "1 1 240px" }}>
              <span style={labelTextStyle}>Predictor values (x)</span>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                value={manualPredictor}
                onChange={(e) => setManualPredictor(e.target.value)}
                placeholder="1,2,3,4,5"
              />
            </label>
            <label style={{ ...fieldWrapperStyle, flex: "1 1 240px" }}>
              <span style={labelTextStyle}>Response values (y)</span>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                value={manualResponse}
                onChange={(e) => setManualResponse(e.target.value)}
                placeholder="10,11,12,13,14"
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSample}
              style={{
                ...inputStyle,
                width: "auto",
                cursor: "pointer",
                border: "1px solid var(--border-muted, #2a3244)"
              }}
            >
              Reset sample data
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "#ff7d7d" }}>{error}</p>}

      <div
        style={{
          width: "100%",
          height: 380,
          marginTop: 12,
          background: chartTheme.surface,
          border: chartTheme.surfaceBorder
        }}
      >
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              dataKey="predicted"
              type="number"
              name="Predicted"
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.axis }}
            />
            <YAxis
              dataKey="actual"
              type="number"
              name="Actual"
              stroke={chartTheme.axis}
              tick={{ fill: chartTheme.axis }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: chartTheme.tooltipBg,
                border: chartTheme.tooltipBorder,
                color: chartTheme.tooltipText
              }}
              itemStyle={{ color: chartTheme.tooltipText }}
              labelStyle={{ color: chartTheme.tooltipText }}
            />
            <Scatter name="Samples" data={scatterData} fill={chartTheme.dot} />
            {hasData && <Line type="linear" dataKey="y" data={lineData} stroke={chartTheme.line} dot={false} />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {hasData && (
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={panelStyle}>
            <strong>Regression coefficients</strong>
            <span>Intercept: {regression.coefficients[0].toFixed(3)}</span>
            {coefficientLabels.map(({ name, value }) => (
              <span key={name}>
                {name}: {value.toFixed(3)}
              </span>
            ))}
            <span>R² = {regression.r2.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
