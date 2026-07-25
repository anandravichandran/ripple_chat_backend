import { reportsRepository } from "./reports.repository"
import { auditService } from "../audit/audit.service"
import { ApiError } from "../../utils/ApiError"
import { parsePagination, buildMeta } from "../../utils/pagination"

export const reportsService = {
	async create(reporterId: string, input: { targetType: string; targetId: string; reason: string; description?: string }) {
		const report = await reportsRepository.create({
			reporter: { connect: { id: reporterId } },
			targetType: input.targetType,
			targetId: input.targetId,
			reason: input.reason,
			description: input.description,
		})

		await auditService.log({
			action: "REPORT_CREATED",
			actorId: reporterId,
			targetId: report.id,
			targetType: "report",
			metadata: { targetType: input.targetType, targetId: input.targetId, reason: input.reason },
		})

		return report
	},

	async list(filters: { status?: string; targetType?: string }, pagination: { page?: string | number; limit?: string | number }) {
		const { page, limit, skip } = parsePagination(pagination)
		const [items, total] = await reportsRepository.list(filters, { skip, take: limit })
		return { items, meta: buildMeta(total, page, limit) }
	},

	async resolve(reviewerId: string, reportId: string, resolution: string) {
		const report = await reportsRepository.findById(reportId)
		if (!report) throw ApiError.notFound("Report not found")
		const updated = await reportsRepository.update(reportId, { status: "RESOLVED", reviewer: { connect: { id: reviewerId } }, resolution, resolvedAt: new Date() })
		await auditService.log({ action: "REPORT_RESOLVED", actorId: reviewerId, targetId: reportId, targetType: "report", metadata: { resolution } })
		return updated
	},

	async dismiss(reviewerId: string, reportId: string, resolution?: string) {
		const report = await reportsRepository.findById(reportId)
		if (!report) throw ApiError.notFound("Report not found")
		const updated = await reportsRepository.update(reportId, { status: "DISMISSED", reviewer: { connect: { id: reviewerId } }, resolution: resolution ?? "Dismissed without action", resolvedAt: new Date() })
		await auditService.log({ action: "REPORT_DISMISSED", actorId: reviewerId, targetId: reportId, targetType: "report", metadata: { resolution } })
		return updated
	},
}
