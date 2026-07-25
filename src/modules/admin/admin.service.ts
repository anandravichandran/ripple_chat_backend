import { adminRepository } from "./admin.repository"
import { ApiError } from "../../utils/ApiError"
import { parsePagination, buildMeta } from "../../utils/pagination"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"

export const adminService = {
	async listUsers(
		filters: {
			q?: string
			role?: string
			status?: string
			isVerified?: string
			sortBy?: string
			sortOrder?: string
		},
		pagination: { page?: string | number; limit?: string | number },
	) {
		const { page, limit, skip } = parsePagination(pagination)
		const sortBy = filters.sortBy ?? "createdAt"
		const sortOrder = (filters.sortOrder ?? "desc") as "asc" | "desc"

		const [items, total] = await adminRepository.listUsers(
			{
				q: filters.q,
				role: filters.role,
				status: filters.status,
				isVerified: filters.isVerified === undefined ? undefined : filters.isVerified === "true",
			},
			{ sortBy, sortOrder },
			skip,
			limit,
		)

		return { items, meta: buildMeta(total, page, limit) }
	},

	async getUser(userId: string) {
		const user = await adminRepository.findById(userId)
		if (!user) throw ApiError.notFound("User not found")
		return user
	},

	async updateUserRole(adminId: string, userId: string, role: string) {
		if (adminId === userId) throw ApiError.badRequest("Cannot change your own role")
		return adminRepository.updateRole(userId, role)
	},

	async suspendUser(userId: string) {
		return adminRepository.toggleSuspension(userId, true)
	},

	async unsuspendUser(userId: string) {
		return adminRepository.toggleSuspension(userId, false)
	},

	async deleteUser(userId: string) {
		await adminRepository.deleteUser(userId)
		getIO()?.emit(SOCKET_EVENTS.USER_OFFLINE, { userId, lastSeen: new Date().toISOString() })
		return { deleted: true }
	},

	async getAnalytics(days = 30) {
		const [snapshot, timeSeries] = await Promise.all([
			adminRepository.getAnalytics(days),
			adminRepository.getTimeSeries(days),
		])
		return { ...snapshot, timeSeries }
	},
}
