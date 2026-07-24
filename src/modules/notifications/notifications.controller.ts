import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { notificationsService } from "./notifications.service"

export const notificationsController = {
	list: asyncHandler(async (req: Request, res: Response) => {
		const { filter, page, limit } = req.query as { filter?: string; page?: string; limit?: string }
		const result = await notificationsService.list(req.user!.id, filter, { page, limit })
		res.status(200).json(ApiResponse.ok("Notifications fetched", result))
	}),

	markRead: asyncHandler(async (req: Request, res: Response) => {
		const result = await notificationsService.markRead(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Notification marked as read", result))
	}),

	markAllRead: asyncHandler(async (req: Request, res: Response) => {
		const result = await notificationsService.markAllRead(req.user!.id)
		res.status(200).json(ApiResponse.ok("All notifications marked as read", result))
	}),

	remove: asyncHandler(async (req: Request, res: Response) => {
		const result = await notificationsService.remove(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Notification deleted", result))
	}),
}
