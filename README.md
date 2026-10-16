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

## Ride map (Cuốc xe)

The Bee/Grab ride map built by the separate `cuoc-xe-dashboard` repo is hosted inside this app, so it needs no hosting of its own.

- **Tree entry:** KHỐI KINH DOANH → Phát triển địa điểm → Cuốc xe, linking to `/cuoc-xe`.
- **Access:** only the sale codes in `CUOC_XE_ALLOWED_SALES` (`src/lib/auth/report-access.ts`, currently `2923` and `250475`) can open it. `src/app/cuoc-xe/[[...path]]/route.ts` redirects signed-out visitors to `/login` and answers 403 to every other user, and the home page hides the Cuốc xe entry (and the then-empty Phát triển địa điểm branch) from them. Edit that list to grant or revoke access. The files contain internal pickup/drop-off addresses, so they live in `reports/cuoc-xe/` and must never go in `/public`.
- **Restricting other reports:** add `allowedSales: [...]` to any node in `src/data/dashboard-data.ts` to hide it from everyone else. This only hides the tree entry; a report served by this app must also check the list in its route, as `/cuoc-xe` does.
- **Files:** `reports/cuoc-xe/` is a copy of `cuoc-xe-dashboard/CUOC_XE_WEB/dist`. Only `.html`, `.js`, `.css`, `.png` and `.svg` files are served; hidden files and paths outside the folder return 404.
- **Size:** `data.js` is ~24 MB. Next does not compress Route Handler responses, so the sync script writes `.gz` copies and the route sends those (~4 MB) to browsers that accept gzip.

Monthly update:

1. In `cuoc-xe-dashboard`, add the new month's files and run `CUOC_XE_WEB/CAP_NHAT_WEB.cmd` (see its `HUONG_DAN.md`).
2. Here, run `npm run sync:cuoc-xe`. It reads `../cuoc-xe-dashboard/CUOC_XE_WEB/dist` by default; pass another path with `npm run sync:cuoc-xe -- <path>`.
3. Commit `reports/cuoc-xe` and redeploy.

## Scripts

| Command                 | Purpose             |
| ----------------------- | ------------------- |
| `npm run dev`           | Development server  |
| `npm run build`         | Production build    |
| `npm test`              | Unit tests (Vitest) |
| `npm run test:coverage` | Tests with coverage |
| `npm run lint`          | ESLint              |
| `npm run typecheck`     | TypeScript check    |
| `npm run format`        | Prettier            |
| `npm run sync:cuoc-xe`  | Copy ride map build |

## Deploy

1. Set the environment variables from `.env.example` on the host.
2. `npm ci && npm run build`
3. `npm start` (behind HTTPS so the `secure` session cookie is sent).
