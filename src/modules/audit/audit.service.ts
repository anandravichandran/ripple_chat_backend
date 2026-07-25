import { auditRepository } from "./audit.repository"
import { parsePagination, buildMeta } from "../../utils/pagination"
import type { AuditAction } from "@prisma/client"

export const auditService = {
	log: (data: {
		action: AuditAction
		actorId?: string
		targetId?: string
		targetType?: string
		metadata?: Record<string, unknown>
		ip?: string
		userAgent?: string
	}) => auditRepository.create(data as never),

	list: async (filters: { action?: string; actorId?: string; targetType?: string }, pagination: { page?: string | number; limit?: string | number }) => {
		const { page, limit, skip } = parsePagination(pagination)
		const [items, total] = await auditRepository.list(filters, { skip, take: limit })
		return { items, meta: buildMeta(total, page, limit) }
	},
}
