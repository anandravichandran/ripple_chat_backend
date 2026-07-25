import { prisma } from "../../database/prisma"
import type { Prisma } from "@prisma/client"

export const auditRepository = {
	create: (data: Prisma.AuditLogCreateInput) => prisma.auditLog.create({ data }),

	list: (filters: { action?: string; actorId?: string; targetType?: string }, pagination: { skip: number; take: number }) =>
		Promise.all([
			prisma.auditLog.findMany({
				where: {
					...(filters.action && { action: filters.action as never }),
					...(filters.actorId && { actorId: filters.actorId }),
					...(filters.targetType && { targetType: filters.targetType }),
				},
				orderBy: { createdAt: "desc" },
				skip: pagination.skip,
				take: pagination.take,
				include: { actor: { select: { id: true, name: true, username: true, avatarUrl: true } } },
			}),
			prisma.auditLog.count({
				where: {
					...(filters.action && { action: filters.action as never }),
					...(filters.actorId && { actorId: filters.actorId }),
					...(filters.targetType && { targetType: filters.targetType }),
				},
			}),
		]),
}
