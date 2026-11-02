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

## Restricting reports

Add `allowedSales: [...]` (sale codes from `dbo.NhanVien2.sale`) to any node in `src/data/dashboard-data.ts` to hide it, and any branch left empty by it, from everyone else. This only hides the tree entry; a report served by this app must also check the list in its own route.

## Offline preview

`npm run preview:html` bundles the current dashboard UI and the full report tree from `src/data/dashboard-data.ts` into `preview/dashboard.html`, which opens straight from disk (double-click) to check the layout without deploying. It skips the login, so it shows every report, including restricted ones. Login and logout do not work in it; the Hướng dẫn button opens `preview/huong-dan.html`, which plays the video and PDF straight from `docs/`. Rerun it after each change. `/preview` is gitignored; do not send the file outside the team.

**Xem trước sau khi sửa** (ví dụ sửa câu chữ, link, trạng thái trong `src/data/dashboard-data.ts`):

1. Mở terminal trong VS Code (`` Ctrl+` ``) và chạy `npm run preview:html`.
2. Đợi dòng `Đã tạo ...\preview\dashboard.html`.
3. Mở `preview/dashboard.html` bằng Chrome/Edge (lần đầu thì double-click), những lần sau chỉ cần bấm F5.

File xem trước không tự cập nhật: mỗi lần sửa xong phải chạy lại bước 1. Nếu lệnh báo lỗi kèm số dòng (thường do thiếu dấu `'` hoặc `,`), sửa dòng đó rồi chạy lại.

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
| `npm run preview:html`  | Offline UI preview  |

## Deploy

1. Set the environment variables from `.env.example` on the host.
2. `npm ci && npm run build`
3. `npm start` (behind HTTPS so the `secure` session cookie is sent).
