const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3001';
const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Optional root message so hitting the backend directly shows something useful
app.get('/', (_req, res) => {
  res.send('GAINS backend running. Try calling /api/welcome.');
});

// Simple health check route for quick verification
app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is reachable from the frontend.' });
});

// Example route the frontend can call to display content on the homepage
app.get('/api/welcome', (_req, res) => {
  res.json({
    title: 'GAINS Backend Connection',
    body: 'Hello from the Express server! The frontend successfully called the backend.'
  });
});

// Lightweight endpoints so the frontend can acknowledge auth events without persistence
app.post('/api/auth/signup', (req, res) => {
  const { accountName } = req.body || {};
  if (!accountName) {
    return res.status(400).json({ status: 'error', message: 'accountName is required.' });
  }

  console.log(`[auth] Signup recorded for account "${accountName}"`);
  return res.json({ status: 'ok', message: 'Signup acknowledged by backend.' });
});

app.post('/api/auth/login', (req, res) => {
  const { accountName } = req.body || {};
  if (!accountName) {
    return res.status(400).json({ status: 'error', message: 'accountName is required.' });
  }

  console.log(`[auth] Login recorded for account "${accountName}"`);
  return res.json({ status: 'ok', message: 'Login acknowledged by backend.' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`CORS enabled for ${FRONTEND_ORIGIN}`);
});
