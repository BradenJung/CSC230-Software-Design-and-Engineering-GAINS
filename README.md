# GAINS Toolkit

A statistics-focused learning platform combining a React/Next.js client with a Node.js backend scaffold. The current milestone delivers the front-end experience for showcasing analytics tools and onboarding users, while the server-side structure is ready for future implementation.

## Getting Started

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

_(Backend services under `server/` are placeholders right now. Once implemented, start them separately and update the client to call the live APIs.)_

## Stack Overview

- **Frontend**: Next.js 15 (Pages Router) with React 19 and CSS Modules for styling.
- **Backend Scaffold**: Node.js project structured with controllers/services/middleware for future Express (or similar) implementation.
- **Tooling**: npm scripts (`npm run dev`, `npm run build`, `npm run start`) provided by `create-next-app`.

## Frontend Highlights

- Auth pages now sit inside the same gradient chrome as the homepage, so login and signup screens feel consistent with the rest of the toolkit.
- The Projects dashboard persists sample projects to `localStorage` and now surfaces a stubbed settings modal for future project-level configuration work.
- Bar and Line Chart routes were restyled with shared layout helpers and informative copy to explain what each visualization module will offer once data hooks are live.

## Account & Storage Model

- **Where data lives**: The client uses browser `localStorage` only. No server-side persistence exists yet, so all account and project data disappears when the browser storage is cleared or the user switches devices/browsers.
- **Active account tracking**: The key `gains.activeAccount` stores the current account name. Changing this value (via the auth screens or manually in DevTools) triggers a custom `gains-auth-change` event so all tabs update their UI.
- **Project snapshots per account**: Projects are saved under the `gains-projects` entry as a JSON payload. Each account name is normalized (trimmed, lowercased) to keep its own list of projects and the next project id counter.
- **Guest fallback**: If no account is selected, a `__guest__` bucket provides default sample projects. Signing out removes the active account key, returning the UI to this guest view.
- **Testing tip**: To simulate multiple accounts locally, open DevTools → Application → Local Storage, duplicate `gains.activeAccount` with a different value, and observe that the Projects page swaps between those stored project lists.

## Directory Guide

```
.
├── Benchmark 1/              # Project documentation PDFs (requirements, design, collaboration)
├── client/                   # Next.js front end
│   ├── package.json          # Front-end dependencies and scripts
│   ├── public/               # Static assets and icons
│   └── src/
│       ├── components/       # Reusable UI (e.g., global Header)
│       ├── pages/            # Routes: home, auth, analytics tools, API stubs
│       └── styles/           # CSS Modules and global theme
└── server/                   # Node backend skeleton
    ├── api/                  # Route handlers (auth, users) – empty placeholders
    ├── config/               # Environment & database setup stubs
    ├── controllers/          # Intended Express controllers
    ├── middleware/           # Auth/error middleware placeholders
    ├── models/               # Data models (e.g., User)
    └── services/             # Business logic layer stubs
```
