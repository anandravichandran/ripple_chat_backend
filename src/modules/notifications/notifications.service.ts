import type { NotificationKind } from "@prisma/client"
import { notificationsRepository } from "./notifications.repository"
import { messagesRepository } from "../messages/messages.repository"
import { authRepository } from "../auth/auth.repository"
import { parsePagination, buildMeta } from "../../utils/pagination"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"
import { ApiError } from "../../utils/ApiError"

const FILTER_KIND_MAP: Record<string, NotificationKind[] | undefined> = {
	all: undefined,
	mentions: ["MENTION"],
	messages: ["MESSAGE", "REPLY"],
	invites: ["INVITE", "ROOM"],
}

async function pushToUser(userId: string, notification: unknown) {
	getIO()?.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, { notification })
}

export const notificationsService = {
	async list(userId: string, filter: string | undefined, pagination: { page?: string | number; limit?: string | number }) {
		const { page, limit, skip } = parsePagination(pagination)
		const kinds = FILTER_KIND_MAP[filter ?? "all"]
		const [items, total, unreadCount] = await notificationsRepository.list(userId, kinds, skip, limit)
		return { items, unreadCount, meta: buildMeta(total, page, limit) }
	},

	async markRead(userId: string, id: string) {
		const result = await notificationsRepository.markRead(userId, id)
		if (result.count === 0) throw ApiError.notFound("Notification not found")
		return { read: true }
	},

	async markAllRead(userId: string) {
		await notificationsRepository.markAllRead(userId)
		return { read: true }
	},

	async remove(userId: string, id: string) {
		const result = await notificationsRepository.remove(userId, id)
		if (result.count === 0) throw ApiError.notFound("Notification not found")
		return { deleted: true }
	},

	async notifyNewMessage(roomId: string, messageId: string, authorId: string, mentionedUserIds: string[]) {
		const author = await authRepository.findUserById(authorId)
		if (!author) return

		const mentionSet = new Set(mentionedUserIds)
		const members = await notificationsRepository.findRoomMemberIds(roomId, authorId)

		for (const member of members) {
			const kind: NotificationKind = mentionSet.has(member.userId) ? "MENTION" : "MESSAGE"
			const notification = await notificationsRepository.create({
				userId: member.userId,
				kind,
				title: kind === "MENTION" ? `${author.name} mentioned you` : `${author.name} sent a message`,
				actorId: authorId,
				roomId,
				messageId,
			})
			void pushToUser(member.userId, notification)
		}
	},

	async notifyReaction(roomId: string, messageId: string, messageAuthorId: string, reactorId: string, emoji: string) {
		if (messageAuthorId === reactorId) return
		const reactor = await authRepository.findUserById(reactorId)
		if (!reactor) return

		const notification = await notificationsRepository.create({
			userId: messageAuthorId,
			kind: "REACTION",
			title: `${reactor.name} reacted ${emoji} to your message`,
			actorId: reactorId,
			roomId,
			messageId,
		})
		void pushToUser(messageAuthorId, notification)
	},

	async notifyRoomInvite(roomId: string, invitedUserId: string, inviterId: string, roomName: string) {
		const inviter = await authRepository.findUserById(inviterId)
		const notification = await notificationsRepository.create({
			userId: invitedUserId,
			kind: "INVITE",
			title: `${inviter?.name ?? "Someone"} invited you to ${roomName}`,
			actorId: inviterId,
			roomId,
		})
		void pushToUser(invitedUserId, notification)
	},
}

void messagesRepository
