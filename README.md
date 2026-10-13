# ICOOL RASA TACO Dashboard Map

Next.js (App Router) dashboard map protected by a login backed by SQL Server (table `dbo.NhanVien2`).

## Authentication

- `POST /api/auth/login` with `{ "sale": "...", "pin": "..." }`
  - `sale` is the username, `pin` is the password.
  - The stored `pin` may be a bcrypt hash (`$2a$`/`$2b$`/`$2y$`) or a plain-text PIN; both are supported.
  - Accounts with `active = 0` or `is_locked = 1` are rejected.
  - Wrong credentials are rate limited (5 failures per 15 minutes per IP + username, in memory).
- On success a signed, `httpOnly` session cookie (JWT, HS256) is set. The dashboard data is only sent to the browser after the session is verified on the server.
- `POST /api/auth/logout` clears the cookie.

## Setup

1. Requires Node.js 20.9 or newer.
2. `npm ci`
3. Copy `.env.example` to `.env.local` and fill in the SQL Server settings and `AUTH_SECRET` (at least 32 characters).
4. `npm run dev` and open http://localhost:3000

SQL Server 2012 note: it only supports TLS 1.0/1.2. Keep `DB_ENCRYPT=false` unless the server presents a valid certificate that modern Node accepts.

## Editing the report tree

Edit `src/data/dashboard-data.ts` (same structure as the original `index.html`).

## User guide

The user guide lives at `docs/huong-dan-su-dung-dashboard.pdf` and is served by `GET /huong-dan` to signed-in users only (the "Hướng dẫn" button in the header). Replace that file to update the guide.

## Scripts

| Command                 | Purpose              |
| ----------------------- | -------------------- |
| `npm run dev`           | Development server   |
| `npm run build`         | Production build     |
| `npm test`              | Unit tests (Vitest)  |
| `npm run test:coverage` | Tests with coverage  |
| `npm run lint`          | ESLint               |
| `npm run typecheck`     | TypeScript check     |
| `npm run format`        | Prettier             |

## Deploy

1. Set the environment variables from `.env.example` on the host.
2. `npm ci && npm run build`
3. `npm start` (behind HTTPS so the `secure` session cookie is sent).
