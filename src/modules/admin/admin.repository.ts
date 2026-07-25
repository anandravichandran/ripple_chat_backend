import { prisma } from "../../database/prisma"
import type { Prisma } from "@prisma/client"

const ADMIN_USER_SELECT = {
	id: true,
	name: true,
	username: true,
	email: true,
	avatarUrl: true,
	bannerUrl: true,
	bio: true,
	phone: true,
	socials: true,
	role: true,
	status: true,
	isVerified: true,
	lastSeen: true,
	lastLoginAt: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.UserSelect

export const adminRepository = {
	listUsers: (
		filters: {
			q?: string
			role?: string
			status?: string
			isVerified?: boolean
		},
		sort: { sortBy: string; sortOrder: "asc" | "desc" },
		skip: number,
		take: number,
	) => {
		const where: Prisma.UserWhereInput = {}
		if (filters.q) {
			where.OR = [
				{ name: { contains: filters.q, mode: "insensitive" } },
				{ username: { contains: filters.q, mode: "insensitive" } },
				{ email: { contains: filters.q, mode: "insensitive" } },
			]
		}
		if (filters.role) where.role = filters.role as never
		if (filters.status) where.status = filters.status as never
		if (filters.isVerified !== undefined) where.isVerified = filters.isVerified

		const orderByField = (filters.q ? "name" : sort.sortBy) as "createdAt" | "name" | "email" | "role" | "status" | "lastSeen"
		const orderDir = (filters.q ? "asc" : sort.sortOrder) as "asc" | "desc"

		return Promise.all([
			prisma.user.findMany({
				where,
				select: ADMIN_USER_SELECT,
				orderBy: { [orderByField]: orderDir },
				skip,
				take,
			}),
			prisma.user.count({ where }),
		])
	},

	findById: (id: string) => prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT }),

	updateRole: (id: string, role: string) =>
		prisma.user.update({ where: { id }, data: { role: role as never }, select: ADMIN_USER_SELECT }),

	toggleSuspension: (id: string, suspended: boolean) =>
		prisma.user.update({
			where: { id },
			data: { isVerified: !suspended },
			select: { id: true, name: true, isVerified: true },
		}),

	deleteUser: (id: string) => prisma.user.delete({ where: { id } }),

	getTimeSeries: async (days: number) => {
		const since = new Date(Date.now() - days * 86400000)
		const raw = await prisma.$queryRaw<{ date: string; users: bigint; messages: bigint; rooms: bigint }[]>`
			SELECT
				DATE(d.date)::text AS date,
				COALESCE(u.cnt, 0) AS users,
				COALESCE(m.cnt, 0) AS messages,
				COALESCE(r.cnt, 0) AS rooms
			FROM generate_series(${since}::date, CURRENT_DATE, '1 day'::interval) d(date)
			LEFT JOIN (SELECT DATE(created_at) AS dt, COUNT(*)::bigint AS cnt FROM users GROUP BY dt) u ON u.dt = d.date
			LEFT JOIN (SELECT DATE(created_at) AS dt, COUNT(*)::bigint AS cnt FROM messages GROUP BY dt) m ON m.dt = d.date
			LEFT JOIN (SELECT DATE(created_at) AS dt, COUNT(*)::bigint AS cnt FROM rooms GROUP BY dt) r ON r.dt = d.date
			ORDER BY d.date
		`
		return raw.map((r) => ({ date: r.date, users: Number(r.users), messages: Number(r.messages), rooms: Number(r.rooms) }))
	},

	getAnalytics: async (days: number) => {
		const since = new Date(Date.now() - days * 86400000)
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const [
			totalUsers,
			onlineUsers,
			verifiedUsers,
			totalRooms,
			totalMessages,
			messagesToday,
			roomsToday,
			newUsersToday,
		] = await Promise.all([
			prisma.user.count(),
			prisma.user.count({ where: { status: "ONLINE" } }),
			prisma.user.count({ where: { isVerified: true } }),
			prisma.room.count(),
			prisma.message.count(),
			prisma.message.count({ where: { createdAt: { gte: today } } }),
			prisma.room.count({ where: { createdAt: { gte: today } } }),
			prisma.user.count({ where: { createdAt: { gte: today } } }),
		])

		const activeUsers = await prisma.user.count({
			where: { lastSeen: { gte: since } },
		})

		const topRooms = await prisma.room.findMany({
			orderBy: { messages: { _count: "desc" } },
			take: 5,
			include: { _count: { select: { messages: true, members: true } } },
		})

		const topUsers = await prisma.user.findMany({
			orderBy: { messages: { _count: "desc" } },
			take: 5,
			include: { _count: { select: { messages: true } } },
		})

		return {
			totalUsers,
			onlineUsers,
			verifiedUsers,
			activeUsers,
			totalRooms,
			totalMessages,
			messagesToday,
			roomsToday,
			newUsersToday,
			topRooms: topRooms.map((r) => ({ id: r.id, name: r.name, messages: r._count.messages, members: r._count.members })),
			topUsers: topUsers.map((u) => ({ id: u.id, name: u.name, username: u.username, messages: u._count.messages })),
		}
	},
}
