import { prisma } from "../../database/prisma"
import { invitesRepository } from "./invites.repository"
import { roomsRepository } from "../rooms/rooms.repository"
import { notificationsRepository } from "../notifications/notifications.repository"
import { ApiError } from "../../utils/ApiError"
import { auditService } from "../audit/audit.service"

export const invitesService = {
	async invite(actorId: string, roomId: string, inviteeId: string, message?: string) {
		if (actorId === inviteeId) throw ApiError.badRequest("Cannot invite yourself")

		const room = await roomsRepository.findById(roomId)
		if (!room) throw ApiError.notFound("Room not found")
		if (room.isDirect) throw ApiError.badRequest("Cannot invite to a direct message room")

		const existing = await invitesRepository.findPending(roomId, inviteeId)
		if (existing) throw ApiError.conflict("Invite already pending")

		const membership = await roomsRepository.findMember(roomId, inviteeId)
		if (membership) throw ApiError.conflict("User is already a member")

		const actorMember = await roomsRepository.findMember(roomId, actorId)
		if (!actorMember || (actorMember.role !== "OWNER" && actorMember.role !== "MODERATOR")) {
			throw ApiError.forbidden("Only room owner or moderator can invite")
		}

		const invite = await invitesRepository.create({
			room: { connect: { id: roomId } },
			inviter: { connect: { id: actorId } },
			invitee: { connect: { id: inviteeId } },
			message: message ?? null,
		})

		await notificationsRepository.create({
			userId: inviteeId,
			kind: "INVITE",
			title: `Invitation to ${room.name}`,
			body: message ?? undefined,
			actorId,
			roomId,
		})

		await auditService.log({ action: "INVITE_SENT", actorId, targetId: inviteeId, targetType: "user", metadata: { roomId, roomName: room.name } })

		return invite
	},

	async accept(userId: string, inviteId: string) {
		const invite = await invitesRepository.findPending("", "")
		return this._acceptOrDecline(userId, inviteId, "ACCEPTED")
	},

	async decline(userId: string, inviteId: string) {
		return this._acceptOrDecline(userId, inviteId, "DECLINED")
	},

	async cancel(userId: string, inviteId: string) {
		const invite = await prisma.roomInvite.findUnique({ where: { id: inviteId } })
		if (!invite) throw ApiError.notFound("Invite not found")
		if (invite.inviterId !== userId) throw ApiError.forbidden("Not your invite to cancel")
		return invitesRepository.update(inviteId, { status: "CANCELLED" })
	},

	listMyInvites(userId: string, status?: string) {
		return invitesRepository.listForInvitee(userId, status)
	},

	listRoomInvites(userId: string, roomId: string) {
		return invitesRepository.listForRoom(roomId)
	},

	async _acceptOrDecline(userId: string, inviteId: string, status: "ACCEPTED" | "DECLINED") {
		const invite = await prisma.roomInvite.findUnique({ where: { id: inviteId } })
		if (!invite) throw ApiError.notFound("Invite not found")
		if (invite.inviteeId !== userId) throw ApiError.forbidden("Not your invite")
		if (invite.status !== "PENDING") throw ApiError.badRequest("Invite is not pending")

		const updated = await invitesRepository.update(inviteId, { status, respondedAt: new Date() })
		if (status === "ACCEPTED") {
			await roomsRepository.addMember(invite.roomId, userId, "MEMBER")
			await auditService.log({ action: "INVITE_ACCEPTED", actorId: userId, targetId: inviteId, targetType: "user", metadata: { roomId: invite.roomId } })
		}
		return updated
	},
}
