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
