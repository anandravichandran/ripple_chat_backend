import { prisma } from "../../database/prisma"
import type { Prisma, UserStatus } from "@prisma/client"

export const PUBLIC_USER_SELECT = {
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
} satisfies Prisma.UserSelect

export const usersRepository = {
	findById: (id: string) => prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT }),

	updateProfile: (id: string, data: Prisma.UserUpdateInput) =>
		prisma.user.update({ where: { id }, data, select: PUBLIC_USER_SELECT }),

	updateAvatar: (id: string, avatarUrl: string, avatarPublicId: string) =>
		prisma.user.update({ where: { id }, data: { avatarUrl, avatarPublicId }, select: PUBLIC_USER_SELECT }),

	findAvatarPublicId: (id: string) =>
		prisma.user.findUnique({ where: { id }, select: { avatarPublicId: true } }),

	updateBanner: (id: string, bannerUrl: string, bannerPublicId: string) =>
		prisma.user.update({ where: { id }, data: { bannerUrl, bannerPublicId }, select: PUBLIC_USER_SELECT }),

	findBannerPublicId: (id: string) =>
		prisma.user.findUnique({ where: { id }, select: { bannerPublicId: true } }),

	setStatus: (id: string, status: UserStatus) =>
		prisma.user.update({ where: { id }, data: { status, lastSeen: new Date() } }),

	touchLastSeen: (id: string) => prisma.user.update({ where: { id }, data: { lastSeen: new Date() } }),

	search: (query: string | undefined, skip: number, take: number) =>
		Promise.all([
			prisma.user.findMany({
				where: query
					? {
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ username: { contains: query, mode: "insensitive" } },
								{ email: { contains: query, mode: "insensitive" } },
							],
					  }
					: undefined,
				select: {
					id: true,
					name: true,
					username: true,
					avatarUrl: true,
					status: true,
				},
				orderBy: { name: "asc" },
				skip,
				take,
			}),
			prisma.user.count({
				where: query
					? {
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ username: { contains: query, mode: "insensitive" } },
								{ email: { contains: query, mode: "insensitive" } },
							],
					  }
					: undefined,
			}),
		]),

	// Connected devices / active sessions (profile page)
	listSessions: (userId: string) =>
		prisma.session.findMany({
			where: { userId, revokedAt: null },
			include: { device: true },
			orderBy: { lastActiveAt: "desc" },
		}),

	listDevices: (userId: string) =>
		prisma.device.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" } }),
}
