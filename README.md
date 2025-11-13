# GAINS Toolkit

## Overview
- Frontend: Next.js 15 + React 19 client that demonstrates the GAINS analytics experience with sample data.
- Backend: Lightweight Express server that exposes placeholder routes so the client can simulate authentication and API calls.
- Storage model: All account and project data lives in browser `localStorage`. Nothing is persisted on the server, so switching browsers, using private mode, or clearing storage resets the app to the default guest projects.

## Tech Stack
- Next.js (Pages Router) with CSS Modules for UI composition.
- Express 4 with CORS enabled for local development.
- Node.js/npm tooling and a helper shell script for combined startup.

## Local Account Storage
- Active account key: `gains.activeAccount` stores the selected account name. Changing it fires a `gains-auth-change` event to keep multiple tabs in sync.
- Project payload key: `gains-projects` contains a JSON object keyed by normalized account names (trimmed, lowercase) with their project lists and next id counters.
- Guest fallback: When no account is present, the UI falls back to a `__guest__` bucket populated with sample projects.
- Since both keys live in local browser storage, the data is temporary—clearing storage or logging in from another browser resets everything.

## Project Structure
```
.
├── Benchmark 1/                # Project documentation PDFs and planning artifacts
├── client/                     # Next.js frontend
│   ├── package.json            # Client dependencies and scripts
│   ├── public/                 # Static assets
│   └── src/
│       ├── components/         # Shared UI (header, footer, cards)
│       ├── pages/              # Route definitions (home, auth, analytics, projects)
│       └── styles/             # CSS Modules and global styles
├── server/                     # Express backend scaffold
│   ├── index.js                # Entry point with sample routes
│   ├── package.json            # Server dependencies and scripts
│   └── ...                     # Placeholder folders for future controllers/services/models
└── start-services.sh           # Convenience script that runs both client and server together
```

## Prerequisites
- Node.js 18+ (or any version supported by both Next.js 15 and Express 4).
- npm (bundled with Node.js).
- macOS, Linux, or WSL terminal capable of running shell scripts.

## Installation
```bash
# From the repository root (installs workspace dependencies for both apps)
npm install
```

## Running the Frontend and Backend Separately
```bash
# Terminal 1 – start the backend (defaults to http://localhost:4000)
cd server
npm run dev     # use `npm start` for a non-reloading process

# Terminal 2 – start the Next.js dev server (runs on http://localhost:3000)
cd client
npm run dev
```
Set `CORS_ORIGIN=http://localhost:3000` (or your chosen frontend URL) when starting the backend if you need to customize ports.

## Running Both Services via Script
```bash
# Make sure the script is executable
chmod +x start-services.sh

# Launch backend and frontend together
./start-services.sh
```
The script installs missing dependencies (via `npm install` at the repo root) and then delegates to `npm run dev`, which starts the backend watcher and the Next.js dev server in parallel. Press `Ctrl+C` once to stop both processes.

You can also run `npm run dev` directly from the repository root if you prefer not to use the shell script.

## Development Tips
- Inspect `localStorage` in your browser developer tools to watch account keys update (`gains.activeAccount`, `gains-projects`).
- To test multiple accounts, manually add a new value to `gains.activeAccount`; the Projects page will load the corresponding project list or create a fresh entry.
- The backend currently logs auth events and returns canned responses—extend `server/` files to implement real persistence when ready.
