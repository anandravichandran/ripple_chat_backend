# Ripple Chat — Socket.io Events

Connect with the in-memory access token (never the refresh cookie):

```ts
import { io } from "socket.io-client"

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  auth: { token: accessToken },
  transports: ["websocket"],
})
```

Unauthenticated or unverified connections are rejected during the handshake with `connect_error` (`UNAUTHORIZED`) before any listener is attached.

## Connection lifecycle

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `connect` | server → client (native) | — | Fires once the JWT handshake succeeds |
| `disconnect` | server → client (native) | `reason` | Client should attempt reconnect with backoff (Socket.io default) |
| `connect_error` | server → client (native) | `Error` | `UNAUTHORIZED` when the token is missing/invalid/expired |
| `heartbeat` | server → client | — | Sent every 25s; client should reply with `heartbeatAck` |
| `heartbeatAck` | client → server | — | Keeps the connection marked alive on the server |
| `reconnect` | client-side (native) | — | Socket.io auto-reconnects; client should re-`joinRoom` the active room |

## Rooms

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `joinRoom` | client → server | `{ roomId }`, ack `{ ok }` | Requires existing `RoomMember`; joins the `room:<id>` channel |
| `leaveRoom` | client → server | `{ roomId }` | Leaves the `room:<id>` channel |
| `roomCreated` | server → all clients | `{ room }` | Emitted by `POST /rooms` |
| `roomUpdated` | server → `room:<id>` | `{ room }` | Emitted by `PATCH /rooms/:id` |
| `roomDeleted` | server → `room:<id>` | `{ roomId }` | Emitted by `DELETE /rooms/:id` |
| `presenceSync` | server → `room:<id>` | `{ roomId, userId, online }` | Fired on `joinRoom`/`leaveRoom` for "currently viewing" indicators |

## Messages

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `sendMessage` | client → server | `{ roomId, text, type?, replyToId?, mentions? }`, ack `{ ok, message }` | Persists the message and fans out `receiveMessage` |
| `receiveMessage` | server → `room:<id>` | `{ message }` | Also emitted by the REST `POST /rooms/:id/messages` for parity |
| `messageEdited` | server → `room:<id>` | `{ message }` | From `PATCH /messages/:id` or reactions |
| `messageDeleted` | server → `room:<id>` | `{ messageId, roomId }` | From `DELETE /messages/:id` |
| `messageDelivered` | client ↔ server | client emits `{ messageId, roomId }`; server broadcasts `{ messageId, userId }` | Marks `Message.deliveredAt` |
| `messageSeen` | client ↔ server | client emits `{ messageId, roomId }`; server broadcasts `{ messageId, roomId, userId }` | Marks `Message.seenAt` and resets the caller's unread counter |

## Typing

| Event | Direction | Payload |
|---|---|---|
| `typing` | client → server → `room:<id>` (excluding sender) | `{ roomId, userId, username }` |
| `stopTyping` | client → server → `room:<id>` (excluding sender) | `{ roomId, userId }` |

## Presence

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `userOnline` | server → all clients | `{ userId }` | Fired the moment a user's **first** socket (across tabs/devices) connects |
| `userOffline` | server → all clients | `{ userId, lastSeen }` | Fired only once **all** of a user's sockets disconnect |

Presence is tracked in-memory per user id as a set of socket ids, so opening the app in multiple tabs or devices does not flicker online/offline state, and `User.status` / `lastSeen` in Postgres are only updated on true online→offline transitions.

## Notifications

| Event | Direction | Payload |
|---|---|---|
| `notification:new` | server → `user:<id>` | `{ notification }` |

Every authenticated socket auto-joins a private `user:<id>` room for these pushes.

## Errors

| Event | Direction | Payload |
|---|---|---|
| `socketError` | server → client | `{ message }` | Emitted instead of throwing when `joinRoom`/`sendMessage` fail (e.g. not a member, empty message) |

## Reconnection guidance for the frontend

1. On `disconnect`, show the reconnect banner and keep queued outgoing messages.
2. Socket.io retries automatically; on the native `reconnect` event, re-emit `joinRoom` for the active room to resume `receiveMessage`/`typing`/`presenceSync`.
3. Refresh the access token first (`POST /auth/refresh`) if the socket disconnected due to `UNAUTHORIZED`, then reconnect with the new token in `auth.token`.
