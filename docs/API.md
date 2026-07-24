# Ripple Chat — API Reference

Base URL: `SERVER_URL` (e.g. `http://localhost:4000`). Every route below is available both unprefixed (`/auth/login`) and under `/api` (`/api/auth/login`).

All responses use the envelope:

```json
{ "success": true, "message": "...", "data": {}, "errors": null }
```

Authenticated routes require `Authorization: Bearer <accessToken>`. Refresh relies on the `refreshToken` httpOnly cookie set by `/auth/login` and `/auth/refresh`.

---

## Auth

### `POST /auth/register`
Body: `{ name, username, email, password }`
Creates an unverified account and emails a 6-digit OTP. Returns `{ id, email, username }`.

### `POST /auth/verify-email`
Body: `{ email, code }`
Activates the account (`isVerified = true`). Max 5 attempts per OTP before it must be resent.

### `POST /auth/resend-otp`
Body: `{ email }` — issues a new OTP (rate-limited to 5 requests / 10 minutes).

### `POST /auth/login`
Body: `{ email, password }`
Returns `{ user, accessToken }` and sets the `refreshToken` cookie. Fails with `403` if the account is not verified.

### `POST /auth/logout` 🔒
Revokes the current refresh token family and clears the cookie.

### `POST /auth/refresh`
Reads the `refreshToken` cookie, rotates it, and returns a new `{ user, accessToken }`. Reusing an already-rotated token revokes the entire session family (theft protection) and returns `401`.

### `POST /auth/forgot-password`
Body: `{ email }` — always returns success; emails a reset link (`CLIENT_URL/reset-password?token=...`) if the account exists.

### `POST /auth/reset-password`
Body: `{ token, password }` — consumes the reset token and updates the password.

---

## Users 🔒

### `GET /users/me`
Returns the authenticated user's public profile.

### `PATCH /users/me`
Body (all optional): `{ name, bio, phone, socials: { twitter, github, linkedin, website }, status }`

### `PATCH /users/avatar`
`multipart/form-data` with field `avatar` (PNG/JPG/WEBP/GIF, ≤ 8MB). Uploads to Cloudinary and replaces the previous avatar.

### `GET /users/search?q=&page=&limit=`
Fuzzy search by name/username/email for mention pickers and "new DM" flows.

### `GET /users/me/sessions`
Returns `{ sessions, devices }` used by the Profile page's "Connected Devices" / "Active Sessions" cards.

---

## Rooms 🔒

### `POST /rooms`
Body: `{ name, description?, icon?, category?, visibility: "PUBLIC"|"PRIVATE", password? }`
Creates the room and adds the caller as `OWNER`. Emits `roomCreated`.

### `GET /rooms?q=&category=&visibility=&pinned=&recentlyJoined=&page=&limit=`
Lists public rooms plus any private rooms the user belongs to, with per-viewer `unread`/`pinned`/`role`.

### `GET /rooms/:id`
Room detail. `403` if private and the caller isn't a member.

### `PATCH /rooms/:id`
Owner/moderator only. Same body shape as create (all fields optional); `password: null` removes password protection.

### `DELETE /rooms/:id`
Owner only. Emits `roomDeleted`.

### `POST /rooms/:id/join`
Body: `{ password?, inviteCode? }`. Public rooms join instantly; private rooms require a matching password or invite code.

### `POST /rooms/:id/leave`
Removes the caller from the room (owners must delete or transfer ownership instead).

---

## Messages 🔒

### `GET /rooms/:id/messages?cursor=&limit=&q=`
Cursor-paginated (newest-first fetch, chronological response) for infinite scroll. Returns `{ items, nextCursor }`.

### `POST /rooms/:id/messages`
Body: `{ text?, type?: "TEXT"|"IMAGE"|"FILE", replyToId?, mentions?: string[], attachment?: { url, publicId, fileName, fileType, fileSize, width?, height? } }`
Requires `text` or `attachment`. Increments unread counters for other members, creates mention/message notifications, and emits `receiveMessage`.

### `GET /rooms/:id/messages/pinned`
Returns pinned messages for the room.

### `POST /rooms/:id/messages/attachments`
`multipart/form-data` field `file` (images + common docs, ≤ 25MB). Upload first, then pass the returned metadata as `attachment` on `POST /rooms/:id/messages`.

### `PATCH /messages/:id`
Body: `{ text? }` (author only, sets `edited`) or `{ pinned? }` (author or moderator). Emits `messageEdited`.

### `DELETE /messages/:id`
Soft-deletes (author or moderator). Emits `messageDeleted`.

### `POST /messages/:id/reactions`
Body: `{ emoji }` — toggles the caller's reaction and notifies the message author.

### `POST /messages/:id/delivered`
Marks a message delivered to the caller; emits `messageDelivered`.

---

## Notifications 🔒

### `GET /notifications?filter=all|mentions|messages|invites&page=&limit=`
Returns `{ items, unreadCount, meta }`.

### `PATCH /notifications/read-all`
Marks every notification as read.

### `PATCH /notifications/:id/read`
Marks a single notification as read.

### `DELETE /notifications/:id`
Deletes a notification.

---

## Health

### `GET /health`
Liveness probe: `{ uptime }`.

---

## Error responses

```json
{ "success": false, "message": "Validation failed", "errors": { "email": ["Enter a valid email address"] } }
```

| Status | Meaning |
|---|---|
| 400 | Validation error / malformed request |
| 401 | Missing/invalid/expired token, wrong credentials |
| 403 | Authenticated but not permitted (unverified email, not a room member, not owner/moderator) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/username, etc.) |
| 429 | Rate limit exceeded |
| 500 | Unexpected server/database error |
