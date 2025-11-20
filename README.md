# GAINS Toolkit

## Overview
- Frontend: Next.js 15 + React 19 client that renders the GAINS analytics experience with sample data and charts.
- Backend: Express 4 service with Mongo helpers, auth routes, and a simple health check; currently used as a mock API surface for the UI.
- Storage model: All account and project data lives in browser `localStorage`. Nothing is persisted on the server, so switching browsers, using private mode, or clearing storage resets the app to the default guest projects.

## Tech Stack
- Next.js (Pages Router) with CSS Modules for UI composition and Recharts/Framer Motion for data viz/animation.
- Express 4 with CORS enabled for local development; MongoDB driver ready for persistence.
- npm workspaces join the `client` and `server` packages; root scripts orchestrate both.

1. **Install dependencies**
   ```bash
   cd client
   npm install
   ```
2. **Run the development server**
   ```bash
   npm run dev
   ```
3. **Open the app** at [http://localhost:3000](http://localhost:3000) to explore the GAINS Toolkit pages.

If your API runs on a different host/port, set `NEXT_PUBLIC_API_BASE` in `client/.env.local` (defaults to `http://localhost:4000`).

### Backend (auth prototype)

The Express server runs on `PORT` (default `4000`) and exposes `POST /api/signup` and `POST /api/login` backed by MongoDB.

1. Install dependencies
   ```bash
   cd server
   npm install
   ```
2. Create `server/.env.local`
   ```
   MONGO_URI=your_connection_string
   DB_NAME=mydb
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   JWT_SECRET=change_me
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   SMTP_FROM="GAINS <no-reply@example.com>"
   ```
3. Start the server
   ```bash
   npm run dev
   ```

Auth: `/api/login` and `/api/signup` issue an HTTP-only cookie (JWT-based). `/api/me` returns the current user from the cookie; `/api/logout` clears it. Emails are treated case-insensitively.

Password rules: minimum 8 characters and must include a number. The client enforces the same, and the API returns a 400 with an error message if it doesn’t meet the rule.

Health check: `/api/health/db` returns Mongo connectivity status; the header shows a small status chip in the UI.

Password reset: `POST /api/forgot-password` emails a 6-char reset code (15 minutes). `POST /api/reset-password` uses `email`, `token`, and `newPassword` to update the account. The client UI is at `/forgot-password`.

Keep `.env.local` files out of git and rotate any previously committed credentials.

_(Backend services under `server/` are placeholders right now. Once implemented, start them separately and update the client to call the live APIs.)_

## Stack Overview

- **Frontend**: Next.js 15 (Pages Router) with React 19 and CSS Modules for styling.
- **Backend Scaffold**: Node.js project structured with controllers/services/middleware for future Express (or similar) implementation.
- **Tooling**: npm scripts (`npm run dev`, `npm run build`, `npm run start`) provided by `create-next-app`.

## Directory Guide

## Project Structure
```
.
├── Benchmark 1/                # Project documentation PDFs and planning artifacts
├── client/                     # Next.js frontend
│   ├── src/
│   │   ├── pages/              # Routes (home, auth, analytics, projects)
│   │   ├── components/         # Shared UI elements
│   │   ├── logic/              # Client-side helpers and localStorage glue
│   │   └── styles/             # CSS Modules and globals
│   └── package.json            # Client scripts: dev/build/start
├── server/                     # Express backend scaffold
│   ├── express.js              # API entry point (CORS + auth routes + DB health check)
│   ├── routes/                 # Route definitions mounted under /api
│   ├── controllers/            # Request handlers
│   ├── services/               # Business logic helpers (auth/user)
│   ├── models/                 # Mongo models
│   ├── config/                 # DB connection + env loader
│   └── middleware/             # Auth and error handling helpers
├── package.json                # npm workspace root scripts (runs client + server together)
└── start-services.sh           # Convenience script that installs deps if needed and runs both apps
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

### Running both from the workspace root
```bash
# Start backend + frontend concurrently (uses npm workspaces)
npm run dev
```

## Running both services via script
```bash
# Make sure the script is executable
chmod +x start-services.sh

# Launch backend and frontend together
./start-services.sh
```
The script installs missing dependencies (via `npm install` at the repo root) and then delegates to `npm run dev`, which starts the backend watcher and the Next.js dev server in parallel. Press `Ctrl+C` once to stop both processes.

## Development Tips
- Inspect `localStorage` in your browser developer tools to watch account keys update (`gains.activeAccount`, `gains-projects`).
- To test multiple accounts, manually add a new value to `gains.activeAccount`; the Projects page will load the corresponding project list or create a fresh entry.
- The backend currently logs auth events and returns canned responses—extend `server/` files to implement real persistence when ready.
