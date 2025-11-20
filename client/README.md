# GAINS Client (Next.js)

Next.js 15 + React 19 frontend that renders the GAINS analytics experience with local project storage, animated dashboards, and hooks to the Express backend.

## Project layout
```
client/
├── src/
│   ├── pages/          # Routes (home, auth, analytics, projects)
│   ├── components/     # Shared UI building blocks
│   ├── logic/          # Client-side helpers and localStorage glue
│   └── styles/         # CSS Modules and global styles
├── public/             # Static assets
└── package.json        # Scripts: dev/build/start
```

## Setup
```bash
# From repo root (preferred, installs workspaces)
npm install

# Or locally
cd client
npm install
```

## Run
```bash
cd client
npm run dev        # http://localhost:3000
# npm run build && npm start  # production build / serve
```
The UI expects the backend at `http://localhost:4000` by default. Adjust CORS on the server if you change ports.

## Notes
- Project/account data is stored in browser `localStorage` only.
- For a one-command workflow, run `npm run dev` or `./start-services.sh` from the repository root to start both client and server together.
