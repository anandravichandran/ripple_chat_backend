import bcrypt from "bcrypt"
import { roomsRepository } from "./rooms.repository"
import { ApiError } from "../../utils/ApiError"
import { parsePagination, buildMeta } from "../../utils/pagination"
import type { CreateRoomInput, UpdateRoomInput } from "./rooms.validator"

function assertOwnerOrModerator(role: string | undefined) {
	if (role !== "OWNER" && role !== "MODERATOR") {
		throw ApiError.forbidden("Only the room owner or moderators can perform this action")
	}
}

export const roomsService = {
	async createRoom(ownerId: string, input: CreateRoomInput) {
		const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null
		const room = await roomsRepository.create({
			name: input.name,
			description: input.description,
			icon: input.icon,
			category: input.category,
			visibility: input.visibility,
			passwordHash,
			ownerId,
		})
		await roomsRepository.addMember(room.id, ownerId, "OWNER")
		return room
	},

	async listRooms(
		userId: string,
		filters: {
			q?: string
			category?: string
			visibility?: "PUBLIC" | "PRIVATE"
			pinned?: string
			recentlyJoined?: string
			isDirect?: string
		},
		pagination: { page?: string | number; limit?: string | number },
	) {
		const { page, limit, skip } = parsePagination(pagination)
		const [rooms, total] = await roomsRepository.listForUser(
			userId,
			{
				q: filters.q,
				category: filters.category,
				visibility: filters.visibility,
				pinned: filters.pinned === undefined ? undefined : filters.pinned === "true",
				recentlyJoined: filters.recentlyJoined === undefined ? undefined : filters.recentlyJoined === "true",
				isDirect: filters.isDirect === undefined ? undefined : filters.isDirect === "true",
			},
			skip,
			limit,
		)

		const items = rooms.map((room) => {
			const membership = room.members[0]
			const lastMessage = room.messages[0]
			return {
				id: room.id,
				name: room.name,
				icon: room.icon,
				description: room.description,
				category: room.category,
				visibility: room.visibility,
				isDirect: room.isDirect,
				members: room._count.members,
				unread: membership?.unreadCount ?? 0,
				pinned: membership?.pinned ?? false,
				recentlyJoined: membership?.recentlyJoined ?? false,
				role: membership?.role ?? null,
				lastMessage: lastMessage?.text ?? null,
				lastAuthor: lastMessage?.author?.name ?? null,
				lastActivity: lastMessage?.createdAt ?? room.updatedAt,
				createdAt: room.createdAt,
			}
		})

		return { items, meta: buildMeta(total, page, limit) }
	},

	async getRoom(userId: string, roomId: string) {
		const room = await roomsRepository.findById(roomId)
		if (!room) throw ApiError.notFound("Room not found")

		const membership = await roomsRepository.findMember(roomId, userId)
		if (room.visibility === "PRIVATE" && !membership) {
			throw ApiError.forbidden("You do not have access to this room")
		}

		const memberCount = await roomsRepository.countMembers(roomId)
		return { ...room, passwordHash: undefined, memberCount, viewerRole: membership?.role ?? null }
	},

	async updateRoom(userId: string, roomId: string, input: UpdateRoomInput) {
		const membership = await roomsRepository.findMember(roomId, userId)
		assertOwnerOrModerator(membership?.role)

		const data: Record<string, unknown> = { ...input }
		if (input.password !== undefined) {
			data.passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null
			delete data.password
		}

		return roomsRepository.update(roomId, data)
	},

	async deleteRoom(userId: string, roomId: string) {
		const membership = await roomsRepository.findMember(roomId, userId)
		if (membership?.role !== "OWNER") throw ApiError.forbidden("Only the room owner can delete this room")
		await roomsRepository.delete(roomId)
		return { deleted: true }
	},

	async joinRoom(userId: string, roomId: string, input: { password?: string; inviteCode?: string }) {
		const room = await roomsRepository.findById(roomId)
		if (!room) throw ApiError.notFound("Room not found")

		const existing = await roomsRepository.findMember(roomId, userId)
		if (existing) return { alreadyMember: true, room }

		if (room.visibility === "PRIVATE") {
			const validInvite = input.inviteCode && input.inviteCode === room.inviteCode
			const validPassword =
				room.passwordHash && input.password && (await bcrypt.compare(input.password, room.passwordHash))
			if (!validInvite && !validPassword) {
				throw ApiError.forbidden("This room requires a valid invite link or password")
			}
		}

		const member = await roomsRepository.addMember(roomId, userId, "MEMBER")
		return { alreadyMember: false, room, member }
	},

	async leaveRoom(userId: string, roomId: string) {
		const membership = await roomsRepository.findMember(roomId, userId)
		if (!membership) throw ApiError.badRequest("You are not a member of this room")
		if (membership.role === "OWNER") {
			throw ApiError.badRequest("Room owner cannot leave. Delete the room or transfer ownership instead")
		}
		await roomsRepository.removeMember(roomId, userId)
		return { left: true }
	},
}
