import { usersRepository } from "./users.repository"
import { uploadImageBuffer, deleteAsset } from "../upload/upload.service"
import { ApiError } from "../../utils/ApiError"
import { parsePagination, buildMeta } from "../../utils/pagination"
import type { UpdateProfileInput } from "./users.validator"

export const usersService = {
	async getMe(userId: string) {
		const user = await usersRepository.findById(userId)
		if (!user) throw ApiError.notFound("User not found")
		return user
	},

	async updateMe(userId: string, input: UpdateProfileInput) {
		return usersRepository.updateProfile(userId, input)
	},

	async updateAvatar(userId: string, file: Express.Multer.File | undefined) {
		if (!file) throw ApiError.badRequest("No avatar file provided")

		const existing = await usersRepository.findAvatarPublicId(userId)
		const uploaded = await uploadImageBuffer(file.buffer, file.mimetype, "avatars")

		const updated = await usersRepository.updateAvatar(userId, uploaded.url, uploaded.publicId)

		if (existing?.avatarPublicId) {
			void deleteAsset(existing.avatarPublicId, "image")
		}

		return updated
	},

	async searchUsers(query: string | undefined, pagination: { page?: string | number; limit?: string | number }) {
		const { page, limit, skip } = parsePagination(pagination)
		const [items, total] = await usersRepository.search(query, skip, limit)
		return { items, meta: buildMeta(total, page, limit) }
	},

	async getSessionsAndDevices(userId: string) {
		const [sessions, devices] = await Promise.all([
			usersRepository.listSessions(userId),
			usersRepository.listDevices(userId),
		])
		return { sessions, devices }
	},
}
