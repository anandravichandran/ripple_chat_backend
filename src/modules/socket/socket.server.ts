import type { Server as HttpServer } from "http"
import { Server, type Socket } from "socket.io"
import { corsOptions } from "../../config/cors"
import { socketLogger } from "../../config/logger"
import { socketAuthMiddleware } from "./socket.auth"
import { SOCKET_EVENTS } from "./socket.events"
import {
	registerSocket,
	unregisterSocket,
	trackRoomJoin,
	trackRoomLeave,
	setUserOnline,
	setUserOffline,
	onlineUserIds,
} from "./socket.presence"
import { prisma } from "../../database/prisma"
import { messagesRepository } from "../messages/messages.repository"
import { roomsRepository } from "../rooms/rooms.repository"
import { notificationsService } from "../notifications/notifications.service"

let io: Server | null = null

export function getIO(): Server | null {
	return io
}

type AppSocket = Socket & { data: { userId: string; username: string; role: string } }

const HEARTBEAT_INTERVAL_MS = 25_000

export function initSocket(httpServer: HttpServer): Server {
	io = new Server(httpServer, {
		cors: { origin: corsOptions.origin as never, credentials: true },
		pingInterval: 20_000,
		pingTimeout: 20_000,
	})

	io.use(socketAuthMiddleware)

	io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => handleConnection(socket as AppSocket))

	socketLogger.info("Socket.io initialized")
	return io
}

async function handleConnection(socket: AppSocket) {
	const { userId, username } = socket.data
	socketLogger.info("Socket connected", { userId, username, socketId: socket.id })

	// Every authenticated user joins a personal room used for direct
	// notifications / DMs regardless of which chat room they're viewing.
	socket.join(`user:${userId}`)

	const wasOffline = registerSocket(userId, socket.id)
	if (wasOffline) {
		await setUserOnline(userId)
		io?.emit(SOCKET_EVENTS.USER_ONLINE, { userId })
	}

	// Heartbeat: server pings, client acks. Combined with socket.io's built-in
	// ping/pong this detects half-open connections quickly and supports
	// graceful reconnect on the client.
	const heartbeat = setInterval(() => socket.emit(SOCKET_EVENTS.HEARTBEAT), HEARTBEAT_INTERVAL_MS)

	socket.on(SOCKET_EVENTS.HEARTBEAT_ACK, () => {
		/* no-op: keeps the connection marked as alive */
	})

	socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomId }: { roomId: string }, ack?: (res: unknown) => void) => {
		try {
			const membership = await roomsRepository.findMember(roomId, userId)
			if (!membership) {
				socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message: "You are not a member of this room" })
				return ack?.({ ok: false })
			}
			socket.join(`room:${roomId}`)
			trackRoomJoin(socket.id, roomId)
			socket.to(`room:${roomId}`).emit(SOCKET_EVENTS.PRESENCE_SYNC, { roomId, userId, online: true })
			ack?.({ ok: true })
		} catch (err) {
			socketLogger.error("joinRoom failed", { userId, roomId, err })
			socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message: "Failed to join room" })
			ack?.({ ok: false })
		}
	})

	socket.on(SOCKET_EVENTS.LEAVE_ROOM, ({ roomId }: { roomId: string }) => {
		socket.leave(`room:${roomId}`)
		trackRoomLeave(socket.id, roomId)
		socket.to(`room:${roomId}`).emit(SOCKET_EVENTS.PRESENCE_SYNC, { roomId, userId, online: false })
	})

	socket.on(
		SOCKET_EVENTS.SEND_MESSAGE,
		async (
			payload: { roomId: string; text?: string; type?: "TEXT" | "IMAGE" | "FILE"; replyToId?: string; mentions?: string[] },
			ack?: (res: unknown) => void,
		) => {
			try {
				const membership = await roomsRepository.findMember(payload.roomId, userId)
				if (!membership) throw new Error("NOT_A_MEMBER")
				if (!payload.text?.trim()) throw new Error("EMPTY_MESSAGE")

				const message = await messagesRepository.create({
					room: { connect: { id: payload.roomId } },
					author: { connect: { id: userId } },
					text: payload.text.trim(),
					type: payload.type ?? "TEXT",
					mentions: payload.mentions ?? [],
					...(payload.replyToId ? { replyTo: { connect: { id: payload.replyToId } } } : {}),
				})

				await roomsRepository.incrementUnreadForOthers(payload.roomId, userId)
				void notificationsService.notifyNewMessage(payload.roomId, message.id, userId, payload.mentions ?? [])

				io?.to(`room:${payload.roomId}`).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, { message })
				ack?.({ ok: true, message })
			} catch (err) {
				socketLogger.error("sendMessage failed", { userId, err })
				socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message: "Failed to send message" })
				ack?.({ ok: false })
			}
		},
	)

	socket.on(SOCKET_EVENTS.TYPING, ({ roomId }: { roomId: string }) => {
		socket.to(`room:${roomId}`).emit(SOCKET_EVENTS.TYPING, { roomId, userId, username })
	})

	socket.on(SOCKET_EVENTS.STOP_TYPING, ({ roomId }: { roomId: string }) => {
		socket.to(`room:${roomId}`).emit(SOCKET_EVENTS.STOP_TYPING, { roomId, userId })
	})

	socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
		try {
			await messagesRepository.markDelivered(messageId)
			io?.to(`room:${roomId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId, userId })
		} catch (err) {
			socketLogger.error("messageDelivered failed", { userId, messageId, err })
		}
	})

	socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
		try {
			await messagesRepository.markSeen(messageId)
			await messagesRepository.markRoomMessagesSeenBefore(roomId, userId, messageId)
			await roomsRepository.markAllRead(roomId, userId)
			io?.to(`room:${roomId}`).emit(SOCKET_EVENTS.MESSAGE_SEEN, { messageId, roomId, userId })
		} catch (err) {
			socketLogger.error("messageSeen failed", { userId, messageId, err })
		}
	})

	socket.on(SOCKET_EVENTS.DISCONNECT, async (reason: string) => {
		clearInterval(heartbeat)
		const fullyOffline = unregisterSocket(userId, socket.id)
		socketLogger.info("Socket disconnected", { userId, socketId: socket.id, reason })

		if (fullyOffline) {
			await setUserOffline(userId)
			io?.emit(SOCKET_EVENTS.USER_OFFLINE, { userId, lastSeen: new Date().toISOString() })
		}
	})
}

/** Utility for admin/debug endpoints — not required by the frontend spec but useful for ops. */
export function getOnlineUserIds(): string[] {
	return onlineUserIds()
}

void prisma
