import { prisma } from "../../database/prisma"
import type { Prisma } from "@prisma/client"

const REPORT_INCLUDE = {
	reporter: { select: { id: true, name: true, username: true, avatarUrl: true } },
	reviewer: { select: { id: true, name: true, username: true } },
} satisfies Prisma.ReportInclude

export const reportsRepository = {
	create: (data: Prisma.ReportCreateInput) => prisma.report.create({ data, include: REPORT_INCLUDE }),

	list: (filters: { status?: string; targetType?: string }, pagination: { skip: number; take: number }) =>
		Promise.all([
			prisma.report.findMany({
				where: {
					...(filters.status && { status: filters.status as never }),
					...(filters.targetType && { targetType: filters.targetType }),
				},
				include: REPORT_INCLUDE,
				orderBy: { createdAt: "desc" },
				skip: pagination.skip,
				take: pagination.take,
			}),
			prisma.report.count({
				where: {
					...(filters.status && { status: filters.status as never }),
					...(filters.targetType && { targetType: filters.targetType }),
				},
			}),
		]),

	findById: (id: string) => prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE }),

	update: (id: string, data: Prisma.ReportUpdateInput) =>
		prisma.report.update({ where: { id }, data, include: REPORT_INCLUDE }),

	countByStatus: () =>
		prisma.report.groupBy({ by: ["status"], _count: true }) as unknown as Promise<{ status: string; _count: number }[]>,
}
