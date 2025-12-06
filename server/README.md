# GAINS Server (Express)

Express 4 API scaffold that backs the GAINS client. It exposes auth routes, a DB health check, and CORS configuration for local development with Next.js.

## Project layout
```
server/
├── express.js          # App entry (CORS, JSON parsing, /api mount, DB health check)
├── routes/             # Route definitions (mounted under /api)
├── controllers/        # Request handlers (e.g., auth controller)
├── services/           # Business logic helpers (auth/user)
├── models/             # MongoDB models
├── config/             # DB connection + env loader
└── middleware/         # Auth guards and error handling
```

## Setup
```bash
# From repo root (preferred)
npm install

# Or locally
cd server
npm install
```

## Environment
Create `server/.env.local` with values for the variables below (sample keys already exist for local dev):
```
PORT=4000
CORS_ORIGIN=http://localhost:3000
MONGO_URI=...
USER_NAME=...
PASSWORD=...
DB_NAME=...
```

## Run
```bash
cd server
npm run dev     # nodemon hot reloads on http://localhost:4000
# npm start     # plain node run
```
You can also start the backend from the workspace root with `npm run dev` or `./start-services.sh` to boot client and server together.
