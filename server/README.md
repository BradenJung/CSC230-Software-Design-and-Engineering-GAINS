# Auth API (Express + MongoDB + JWT)

Endpoints:
- `POST /api/auth/register` – email, username, password
- `POST /api/auth/login` – email (or username) + password -> JWT
- `GET /api/auth/me` – requires `Authorization: Bearer <token>`

## Quick start

```bash
# inside server/
cp .env.example .env   # put your MONGO_URI and JWT_SECRET here
npm install
npm run dev
```

Open `http://localhost:4000/health` to check server.

> **Important:** Never commit real secrets. Use `.env` locally and keep only `.env.example` in Git.

## Frontend example
```js
// login
const resp = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const data = await resp.json();
localStorage.setItem("token", data.access_token);

// me
await fetch("http://localhost:4000/api/auth/me", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});
```
