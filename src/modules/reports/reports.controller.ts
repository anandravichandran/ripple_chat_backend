import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { reportsService } from "./reports.service"

export const reportsController = {
	create: asyncHandler(async (req: Request, res: Response) => {
		const report = await reportsService.create(req.user!.id, req.body)
		res.status(201).json(ApiResponse.ok("Report created", report))
	}),

	list: asyncHandler(async (req: Request, res: Response) => {
		const { status, targetType, page, limit } = req.query as Record<string, string>
		const result = await reportsService.list({ status, targetType }, { page, limit })
		res.status(200).json(ApiResponse.ok("Reports fetched", result))
	}),

	resolve: asyncHandler(async (req: Request, res: Response) => {
		const report = await reportsService.resolve(req.user!.id, req.params.id, req.body.resolution)
		res.status(200).json(ApiResponse.ok("Report resolved", report))
	}),

	dismiss: asyncHandler(async (req: Request, res: Response) => {
		const report = await reportsService.dismiss(req.user!.id, req.params.id, req.body.resolution)
		res.status(200).json(ApiResponse.ok("Report dismissed", report))
	}),
}
