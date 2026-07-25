import { messagesRepository } from "./messages.repository"
import { roomsRepository } from "../rooms/rooms.repository"
import { prisma } from "../../database/prisma"
import { ApiError } from "../../utils/ApiError"
import { notificationsService } from "../notifications/notifications.service"
import type { CreateMessageInput, UpdateMessageInput } from "./messages.validator"

async function assertMember(roomId: string, userId: string) {
	const membership = await roomsRepository.findMember(roomId, userId)
	if (membership) return membership
	const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, visibility: true } })
	if (!room) throw ApiError.notFound("Room not found")
	if (room.visibility === "PUBLIC") {
		return roomsRepository.addMember(roomId, userId, "MEMBER")
	}
	throw ApiError.forbidden("You must join this room first")
}

export const messagesService = {
	async listMessages(userId: string, roomId: string, opts: { cursor?: string; limit?: number; q?: string }) {
		await assertMember(roomId, userId)
		const limit = opts.limit ?? 30
		const messages = await messagesRepository.listByRoom(roomId, { cursor: opts.cursor, limit, q: opts.q })
		const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null
		return { items: messages.reverse(), nextCursor }
	},

	async listPinned(userId: string, roomId: string) {
		await assertMember(roomId, userId)
		return messagesRepository.listPinned(roomId)
	},

	async createMessage(userId: string, roomId: string, input: CreateMessageInput) {
		await assertMember(roomId, userId)

		if (!input.text && !input.attachment) {
			throw ApiError.badRequest("Message must contain text or an attachment")
		}

		if (input.replyToId) {
			const replyTarget = await messagesRepository.findById(input.replyToId)
			if (!replyTarget || replyTarget.roomId !== roomId) {
				throw ApiError.badRequest("The message being replied to does not exist in this room")
			}
		}

		const message = await messagesRepository.create({
			room: { connect: { id: roomId } },
			author: { connect: { id: userId } },
			text: input.text ?? null,
			type: input.type,
			mentions: input.mentions ?? [],
			...(input.replyToId ? { replyTo: { connect: { id: input.replyToId } } } : {}),
		})

		if (input.attachment) {
			await messagesRepository.createAttachment(message.id, input.attachment)
		}

		await roomsRepository.incrementUnreadForOthers(roomId, userId)

		await notificationsService.notifyNewMessage(roomId, message.id, userId, input.mentions ?? [])

		return messagesRepository.findById(message.id)
	},

	async updateMessage(userId: string, messageId: string, input: UpdateMessageInput) {
		const message = await messagesRepository.findById(messageId)
		if (!message || message.deletedAt) throw ApiError.notFound("Message not found")

		const membership = await roomsRepository.findMember(message.roomId, userId)
		const isAuthor = message.authorId === userId
		const isModerator = membership?.role === "OWNER" || membership?.role === "MODERATOR"

		if (input.text !== undefined) {
			if (!isAuthor) throw ApiError.forbidden("You can only edit your own messages")
			return messagesRepository.update(messageId, { text: input.text, edited: true, editedAt: new Date() })
		}

		if (input.pinned !== undefined) {
			if (!isAuthor && !isModerator) throw ApiError.forbidden("Only moderators can pin messages")
			return messagesRepository.update(messageId, { pinned: input.pinned })
		}

		return message
	},

	async deleteMessage(userId: string, messageId: string) {
		const message = await messagesRepository.findById(messageId)
		if (!message || message.deletedAt) throw ApiError.notFound("Message not found")

		const membership = await roomsRepository.findMember(message.roomId, userId)
		const isAuthor = message.authorId === userId
		const isModerator = membership?.role === "OWNER" || membership?.role === "MODERATOR"
		if (!isAuthor && !isModerator) throw ApiError.forbidden("You do not have permission to delete this message")

		return messagesRepository.softDelete(messageId)
	},

	async react(userId: string, messageId: string, emoji: string) {
		const message = await messagesRepository.findById(messageId)
		if (!message || message.deletedAt) throw ApiError.notFound("Message not found")
		await assertMember(message.roomId, userId)

		const existing = message.reactions.find((r) => r.userId === userId && r.emoji === emoji)
		if (existing) {
			await messagesRepository.removeReaction(messageId, userId, emoji)
		} else {
			await messagesRepository.addReaction(messageId, userId, emoji)
			await notificationsService.notifyReaction(message.roomId, messageId, message.authorId, userId, emoji)
		}

		return messagesRepository.findById(messageId)
	},

	async markDelivered(userId: string, messageId: string) {
		const message = await messagesRepository.findById(messageId)
		if (!message) throw ApiError.notFound("Message not found")
		await assertMember(message.roomId, userId)
		return messagesRepository.markDelivered(messageId)
	},

	async markSeen(userId: string, roomId: string, messageId: string) {
		await assertMember(roomId, userId)
		await messagesRepository.markRoomMessagesSeenBefore(roomId, userId, messageId)
		await roomsRepository.markAllRead(roomId, userId)
		return { seen: true }
	},
}
