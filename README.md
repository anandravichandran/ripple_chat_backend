# Ripple Chat — Backend

Production-ready backend for **Ripple Chat**, built with Node.js 22, Express, TypeScript, PostgreSQL (Neon) + Prisma, and Socket.io. It implements the full REST API and realtime events required by the existing Ripple Chat frontend without any changes to the UI.

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Realtime | Socket.io |
| Auth | JWT access + refresh (rotation + reuse detection) |
| Validation | Zod + express-validator |
| Email | Nodemailer |
| Storage | Cloudinary |
| Hashing | bcrypt |
| Security | Helmet, CORS, rate limiting, cookie-parser, compression |
| Logging | Winston + Morgan |

## Project structure

```
src/
  config/          env, cors, logger, cloudinary
  database/        Prisma client singleton + connect/disconnect
  middlewares/      auth, role, validate, error, rateLimiter, upload
  modules/
    auth/          register/login/verify/refresh/forgot/reset
    users/         profile, avatar, search, sessions
    rooms/         create/list/get/update/delete/join/leave
    messages/      list/create/edit/delete/react/attachments/receipts
    notifications/ list/mark-read/mark-all-read/delete
    socket/        Socket.io server, JWT socket auth, presence
    email/         Nodemailer transport + HTML templates
    upload/        Cloudinary upload service
  routes/          central API router
  utils/           ApiResponse, ApiError, jwt, otp, token, password, pagination
  types/           shared + Express augmentation
  app.ts           Express app wiring
  server.ts        HTTP + Socket.io bootstrap, graceful shutdown
prisma/
  schema.prisma    full normalized schema (12 models, UUID PKs, indexes, FKs)
  seed.ts          demo users + room + message
docs/
  API.md           REST API reference
  SOCKET_EVENTS.md Socket.io event reference
ripple-chat-backend.postman_collection.json
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in real values (Neon connection string, JWT secrets, SMTP, Cloudinary):

```bash
cp .env.example .env
```

Generate strong JWT secrets, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init   # creates tables from prisma/schema.prisma
npm run prisma:seed                  # optional demo data
```

### 4. Run the server

```bash
npm run dev       # ts-node/tsx watch mode on http://localhost:4000
npm run build     # compile to dist/
npm start         # run compiled build
```

A health check is available at `GET /health` (also mirrored at `GET /api/health`).

## API response format

Every endpoint returns a consistent envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {},
  "errors": null
}
```

Routes are available both unprefixed (e.g. `POST /auth/login`, matching the original spec exactly) and under `/api` (e.g. `POST /api/auth/login`) — point the frontend `NEXT_PUBLIC_API_URL` at either.

See `docs/API.md` for the full endpoint reference and `docs/SOCKET_EVENTS.md` for realtime events. Import `ripple-chat-backend.postman_collection.json` into Postman to try every route (set the `baseUrl` and `accessToken` collection variables).

## Authentication model

- **Access token** (15 min, `JWT_ACCESS_EXPIRES`): returned in the JSON body on login/refresh. The frontend keeps it **in memory only** and sends it as `Authorization: Bearer <token>`.
- **Refresh token** (7 days, `JWT_REFRESH_EXPIRES`): set as an `httpOnly`, `secure`, `sameSite=strict` cookie (`refreshToken`). Never exposed to JS.
- **Rotation**: every `POST /auth/refresh` issues a brand-new refresh token and immediately revokes the previous one (same rotation `family`).
- **Reuse detection**: if a revoked refresh token is presented again, the entire token family is revoked server-side and the user must log in again — this contains stolen-token replay attacks.
- **Email verification gate**: `isVerified` must be `true` to log in or to authenticate a Socket.io connection.
- **Roles**: `USER`, `MODERATOR`, `ADMIN` via `requireRole()` middleware.

## Realtime (Socket.io)

- The client connects with `io(SERVER_URL, { auth: { token: accessToken } })`.
- `socketAuthMiddleware` verifies the JWT and loads the user before any event handler runs; unauthenticated/unverified sockets are rejected at handshake time.
- Presence is tracked in-memory per user (a `Set` of socket ids) so a user is only marked offline once **every** tab/device disconnects (multi-tab safe). Presence flips also update `User.status`/`lastSeen` in Postgres.
- Server-initiated heartbeat (`heartbeat`/`heartbeatAck`) runs alongside Socket.io's built-in ping/pong for fast dead-connection detection and graceful client reconnects.
- REST mutations that affect connected clients (new/edited/deleted messages, room create/update/delete) also emit the matching Socket.io event so REST-only and socket-driven UIs stay in sync.

Full event catalogue: `docs/SOCKET_EVENTS.md`.

## Security checklist

- `helmet()` for secure headers, strict CORS allow-list from `CLIENT_URL`.
- Global + auth-specific + OTP-specific rate limiting (`express-rate-limit`).
- All input validated with Zod (`middlewares/validate.middleware.ts`) before hitting services.
- Passwords hashed with bcrypt (12 rounds); OTPs and reset/refresh tokens are hashed before storage — raw secrets are never persisted.
- Prisma uses parameterized queries everywhere; no raw string-interpolated SQL.
- `env.ts` validates all required environment variables with Zod at boot and fails fast if misconfigured.
- Centralized error handler normalizes Zod, Prisma, JWT, Multer, and generic errors into the standard response envelope and never leaks stack traces in production.

## Uploads

- Avatars: `PATCH /users/avatar` (multipart field `avatar`), images only, 8MB max, resized/optimized via Cloudinary transformation.
- Message attachments: `POST /rooms/:id/messages/attachments` (multipart field `file`), images + common document types, 25MB max, uploaded to Cloudinary and attached to a message via `attachment` in `POST /rooms/:id/messages`.

## Logging

- `winston` writes structured JSON logs to `logs/combined.log` and `logs/error.log`, plus colorized console output in development. Scoped child loggers exist for `auth` and `socket` concerns.
- `morgan` streams HTTP access logs into the same Winston pipeline (`combined` format), skipping health checks.

## Notes on scope

- The Admin Panel described in the frontend brief is UI-only (per that spec) and is not backed by dedicated admin CRUD endpoints here; standard role-based middleware (`requireRole("ADMIN")`) is included and ready to protect any admin routes you add later.
- Direct messages are modeled as private 1:1 `Room`s (`isDirect: true`) rather than a separate collection, so DMs reuse the same rooms/messages infrastructure, permissions, and realtime events as group rooms.
