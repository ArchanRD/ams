# Attendance Backend (Express + Firebase)

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file and configure values:
   ```bash
   cp .env.example .env
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

Base URL: `http://localhost:4000/api`

Set `CORS_ORIGIN` in `.env` as a comma-separated list when needed, for example:
`CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000`

## Auth model

- Frontend logs in with Firebase Auth.
- Frontend sends Firebase ID token in `Authorization: Bearer <token>`.
- Protected APIs only allow admin users.
- Admin check order:
  1. Email exists in `ADMIN_EMAILS` env var.
  2. Or `admins/{uid}` or `admins/{email}` document has `{ role: "admin", active: true }`.
  3. Or any `admins` document where `uid == <uid>` or `email == <email>` has `{ role: "admin", active: true }`.

## Endpoints

- `GET /api/health`
- `POST /api/auth/verify-session`
  - body: `{ "idToken": "..." }`
- `GET /api/members?search=<name-or-phone>` (admin)
  - if `search` is omitted or empty, returns members list
  - accepts optional `date=YYYY-MM-DD`; response includes `attendanceStatus` for each member on that date
- `POST /api/members` (admin)
  - body: `{ "name": "Jane Doe", "phone": "+91 9999999999", "type": "devotee" }`
  - idempotent behavior:
    - creates member and returns `201` with `meta.created=true`
    - if already exists, returns `200` with existing member and `meta.created=false`
- `POST /api/attendance/mark` (admin)
  - body: `{ "memberId": "...", "date": "2026-03-12", "status": "PRESENT", "overwrite": false }`
  - duplicate policy:
    - default: duplicate mark for same `memberId` + `date` returns `409`
    - explicit overwrite: send `overwrite=true`
- `GET /api/attendance?from=2026-03-01&to=2026-03-31` (admin)
- `GET /api/attendance/export?from=2026-03-01&to=2026-03-31` (admin)

## Firestore collections

- `members`
- `attendance`
- `admins`
