import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { auditService } from "./audit.service"

export const auditController = {
	list: asyncHandler(async (req: Request, res: Response) => {
		const { action, actorId, targetType, page, limit } = req.query as Record<string, string>
		const result = await auditService.list({ action, actorId, targetType }, { page, limit })
		res.status(200).json(ApiResponse.ok("Audit logs fetched", result))
	}),
}
