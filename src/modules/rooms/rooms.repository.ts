import { prisma } from "../../database/prisma"
import type { Prisma, RoomMemberRole, RoomVisibility } from "@prisma/client"

export const roomsRepository = {
	create: (data: {
		name: string
		description?: string
		icon?: string
		category?: string
		visibility: RoomVisibility
		passwordHash?: string | null
		ownerId: string
	}) => prisma.room.create({ data }),

	findById: (id: string) =>
		prisma.room.findUnique({
			where: { id },
			include: { owner: { select: { id: true, name: true, username: true, avatarUrl: true } } },
		}),

	update: (id: string, data: Prisma.RoomUpdateInput) => prisma.room.update({ where: { id }, data }),

	delete: (id: string) => prisma.room.delete({ where: { id } }),

	countMembers: (roomId: string) => prisma.roomMember.count({ where: { roomId } }),

	findMember: (roomId: string, userId: string) =>
		prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } }),

	addMember: (roomId: string, userId: string, role: RoomMemberRole = "MEMBER") =>
		prisma.roomMember.create({ data: { roomId, userId, role } }),

	removeMember: (roomId: string, userId: string) =>
		prisma.roomMember.delete({ where: { roomId_userId: { roomId, userId } } }),

	clearRecentlyJoined: (roomId: string, userId: string) =>
		prisma.roomMember.update({
			where: { roomId_userId: { roomId, userId } },
			data: { recentlyJoined: false },
		}),

	listForUser: (
		userId: string,
		filters: {
			q?: string
			category?: string
			visibility?: RoomVisibility
			pinned?: boolean
			recentlyJoined?: boolean
			isDirect?: boolean
		},
		skip: number,
		take: number,
	) => {
		const memberWhere: Prisma.RoomMemberWhereInput = { userId }
		if (filters.pinned !== undefined) memberWhere.pinned = filters.pinned
		if (filters.recentlyJoined !== undefined) memberWhere.recentlyJoined = filters.recentlyJoined

		const roomWhere: Prisma.RoomWhereInput = {
			OR: [{ visibility: "PUBLIC" }, { members: { some: { userId } } }],
		}
		if (filters.q) roomWhere.name = { contains: filters.q, mode: "insensitive" }
		if (filters.category) roomWhere.category = filters.category
		if (filters.visibility) roomWhere.visibility = filters.visibility
		if (filters.isDirect !== undefined) roomWhere.isDirect = filters.isDirect
		if (filters.pinned !== undefined || filters.recentlyJoined !== undefined) {
			roomWhere.members = { some: { ...memberWhere } }
		}

		return Promise.all([
			prisma.room.findMany({
				where: roomWhere,
				include: {
					_count: { select: { members: true, messages: true } },
					members: { where: { userId }, select: { pinned: true, recentlyJoined: true, unreadCount: true, role: true } },
					messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
				},
				orderBy: { updatedAt: "desc" },
				skip,
				take,
			}),
			prisma.room.count({ where: roomWhere }),
		])
	},

	markAllRead: (roomId: string, userId: string) =>
		prisma.roomMember.update({ where: { roomId_userId: { roomId, userId } }, data: { unreadCount: 0 } }),

	incrementUnreadForOthers: (roomId: string, excludeUserId: string) =>
		prisma.roomMember.updateMany({
			where: { roomId, userId: { not: excludeUserId } },
			data: { unreadCount: { increment: 1 } },
		}),
}
