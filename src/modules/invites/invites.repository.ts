import { prisma } from "../../database/prisma"
import type { Prisma } from "@prisma/client"

const INVITE_INCLUDE = {
	room: { select: { id: true, name: true, icon: true, visibility: true } },
	inviter: { select: { id: true, name: true, username: true, avatarUrl: true } },
	invitee: { select: { id: true, name: true, username: true, avatarUrl: true } },
} satisfies Prisma.RoomInviteInclude

export const invitesRepository = {
	create: (data: Prisma.RoomInviteCreateInput) => prisma.roomInvite.create({ data, include: INVITE_INCLUDE }),

	findPending: (roomId: string, inviteeId: string) =>
		prisma.roomInvite.findFirst({ where: { roomId, inviteeId, status: "PENDING" } }),

	listForInvitee: (userId: string, status?: string) =>
		prisma.roomInvite.findMany({
			where: { inviteeId: userId, ...(status && { status: status as never }) },
			include: INVITE_INCLUDE,
			orderBy: { createdAt: "desc" },
		}),

	listForRoom: (roomId: string) =>
		prisma.roomInvite.findMany({
			where: { roomId },
			include: INVITE_INCLUDE,
			orderBy: { createdAt: "desc" },
		}),

	update: (id: string, data: Prisma.RoomInviteUpdateInput) =>
		prisma.roomInvite.update({ where: { id }, data, include: INVITE_INCLUDE }),
}
