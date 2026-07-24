import { prisma } from "../../database/prisma"
import type { Prisma } from "@prisma/client"

const AUTHOR_SELECT = { id: true, name: true, username: true, avatarUrl: true, status: true } satisfies Prisma.UserSelect

export const MESSAGE_INCLUDE = {
	author: { select: AUTHOR_SELECT },
	attachments: true,
	reactions: { include: { user: { select: { id: true, name: true } } } },
	replyTo: { include: { author: { select: AUTHOR_SELECT } } },
} satisfies Prisma.MessageInclude

export const messagesRepository = {
	listByRoom: (roomId: string, opts: { cursor?: string; limit: number; q?: string }) =>
		prisma.message.findMany({
			where: {
				roomId,
				deletedAt: null,
				...(opts.q ? { text: { contains: opts.q, mode: "insensitive" } } : {}),
			},
			include: MESSAGE_INCLUDE,
			orderBy: { createdAt: "desc" },
			take: opts.limit,
			...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
		}),

	listPinned: (roomId: string) =>
		prisma.message.findMany({
			where: { roomId, pinned: true, deletedAt: null },
			include: MESSAGE_INCLUDE,
			orderBy: { createdAt: "desc" },
		}),

	findById: (id: string) => prisma.message.findUnique({ where: { id }, include: MESSAGE_INCLUDE }),

	create: (data: Prisma.MessageCreateInput) => prisma.message.create({ data, include: MESSAGE_INCLUDE }),

	update: (id: string, data: Prisma.MessageUpdateInput) =>
		prisma.message.update({ where: { id }, data, include: MESSAGE_INCLUDE }),

	softDelete: (id: string) =>
		prisma.message.update({ where: { id }, data: { deletedAt: new Date(), text: null }, include: MESSAGE_INCLUDE }),

	markDelivered: (id: string) => prisma.message.update({ where: { id }, data: { deliveredAt: new Date() } }),

	markSeen: (id: string) => prisma.message.update({ where: { id }, data: { seenAt: new Date() } }),

	markRoomMessagesSeenBefore: (roomId: string, userId: string, beforeMessageId: string) =>
		prisma.message.updateMany({
			where: {
				roomId,
				authorId: { not: userId },
				seenAt: null,
				id: { lte: beforeMessageId },
			},
			data: { seenAt: new Date() },
		}),

	addReaction: (messageId: string, userId: string, emoji: string) =>
		prisma.messageReaction.upsert({
			where: { messageId_userId_emoji: { messageId, userId, emoji } },
			update: {},
			create: { messageId, userId, emoji },
		}),

	removeReaction: (messageId: string, userId: string, emoji: string) =>
		prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } }),

	createAttachment: (
		messageId: string,
		data: { url: string; publicId: string; fileName: string; fileType: string; fileSize: number; width?: number; height?: number },
	) => prisma.attachment.create({ data: { messageId, ...data } }),
}
