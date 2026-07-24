import { prisma } from "../../database/prisma"
import type { NotificationKind, Prisma } from "@prisma/client"

const ACTOR_SELECT = { id: true, name: true, avatarUrl: true } satisfies Prisma.UserSelect

export const notificationsRepository = {
	create: (data: {
		userId: string
		kind: NotificationKind
		title: string
		body?: string
		actorId?: string
		roomId?: string
		messageId?: string
	}) => prisma.notification.create({ data, include: { actor: { select: ACTOR_SELECT } } }),

	list: (userId: string, kinds: NotificationKind[] | undefined, skip: number, take: number) =>
		Promise.all([
			prisma.notification.findMany({
				where: { userId, ...(kinds ? { kind: { in: kinds } } : {}) },
				include: { actor: { select: ACTOR_SELECT } },
				orderBy: { createdAt: "desc" },
				skip,
				take,
			}),
			prisma.notification.count({ where: { userId, ...(kinds ? { kind: { in: kinds } } : {}) } }),
			prisma.notification.count({ where: { userId, read: false } }),
		]),

	markRead: (userId: string, id: string) =>
		prisma.notification.updateMany({ where: { id, userId }, data: { read: true } }),

	markAllRead: (userId: string) => prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } }),

	remove: (userId: string, id: string) => prisma.notification.deleteMany({ where: { id, userId } }),

	findRoomMemberIds: (roomId: string, excludeUserId: string) =>
		prisma.roomMember.findMany({ where: { roomId, userId: { not: excludeUserId } }, select: { userId: true } }),
}
