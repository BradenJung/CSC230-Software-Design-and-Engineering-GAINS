// /client/pages/api/openai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// We only show the model a small sample of the project data so the requests stay light.
const PROJECT_CONTEXT_ROW_LIMIT = 25;

// Turn any incoming value into a safe string the model can read.
const ensureString = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

// Figure out which column names to display alongside the sample rows.
const resolveColumnNames = (rows, providedColumns) => {
  if (Array.isArray(providedColumns) && providedColumns.length > 0) {
    return providedColumns.filter((column) => typeof column === "string" && column.trim());
  }

  const columnSet = new Set();
  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    Object.keys(row).forEach((key) => {
      if (typeof key === "string" && key.trim()) {
        columnSet.add(key);
      }
    });
  });

  return Array.from(columnSet);
};

// Translate the current project selection into a short system message for the model.
const formatProjectContext = (context) => {
  if (!context || typeof context !== "object") {
    return null;
  }

  const projectName =
    typeof context.projectName === "string" && context.projectName.trim()
      ? context.projectName.trim()
      : "Current Project";

  const importedRows = Array.isArray(context.importedRows) ? context.importedRows : [];
  const totalRows =
    typeof context.totalRows === "number" && Number.isFinite(context.totalRows)
      ? context.totalRows
      : importedRows.length;

  if (importedRows.length === 0) {
    if (totalRows > 0) {
      return `Project context for "${projectName}": ${totalRows} imported row(s) could not be loaded for preview, so rely on user clarification if needed.`;
    }
    return `Project context for "${projectName}": no imported dataset is currently available.`;
  }

  const columns = resolveColumnNames(importedRows, context.columnNames);
  const limitedRows = importedRows.slice(0, PROJECT_CONTEXT_ROW_LIMIT);

  const formattedRows = limitedRows
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        return `${index + 1}. ${ensureString(row)}`;
      }

      if (columns.length === 0) {
        const entries = Object.entries(row).map(
          ([key, value]) => `${ensureString(key)}: ${ensureString(value)}`
        );
        return `${index + 1}. ${entries.join(", ")}`;
      }

      const cells = columns.map((column) => `${column}: ${ensureString(row[column])}`);
      return `${index + 1}. ${cells.join(", ")}`;
    })
    .join("\n");

  const columnLine = columns.length > 0 ? `Columns: ${columns.join(", ")}.` : "";
  const previewQualifier =
    limitedRows.length < totalRows
      ? `Showing the first ${limitedRows.length} of ${totalRows} rows.`
      : `Total rows: ${totalRows}.`;

  return [
    `Project context for "${projectName}".`,
    columnLine,
    previewQualifier,
    "Sample rows:",
    formattedRows
  ]
    .filter(Boolean)
    .join("\n");
};

// Baseline instructions that keep the assistant short, simple, and predictable.
const SYSTEM_PROMPT = `
You are GAINS Tutor, answer any questions asked with 3 sentences or less. All responses should be easy to
understand assuming the user has limited R code knowledge. 

If asked "Test", answer with "TESTING GOOD".

If asked "Large", answer with "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.".

If asked a math equation, simply reply with the answer and nothing else.
`;

export default async function handler(req, res) {
  // Lock the route to POST so we do not leak the API from random GETs.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, projectContext } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing messages array" });
  }

  // If we have project data, slip it in as an extra system message so the model sees it first.
  const contextMessage = formatProjectContext(projectContext);
  const requestMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(contextMessage ? [{ role: "system", content: contextMessage }] : []),
    ...messages
  ];

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: requestMessages
    });

    const reply = completion.choices?.[0]?.message?.content ?? "No response";
    res.status(200).json({ reply });
  } catch (err) {
    // Log and surface a friendlier response if the OpenAI call fails.
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
}
