import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { adminService } from "./admin.service"

export const adminController = {
	listUsers: asyncHandler(async (req: Request, res: Response) => {
		const { q, role, status, isVerified, sortBy, sortOrder, page, limit } = req.query as Record<string, string>
		const result = await adminService.listUsers({ q, role, status, isVerified, sortBy, sortOrder }, { page, limit })
		res.status(200).json(ApiResponse.ok("Users fetched", result))
	}),

	getUser: asyncHandler(async (req: Request, res: Response) => {
		const user = await adminService.getUser(req.params.id)
		res.status(200).json(ApiResponse.ok("User fetched", user))
	}),

	updateUserRole: asyncHandler(async (req: Request, res: Response) => {
		const user = await adminService.updateUserRole(req.user!.id, req.params.id, req.body.role)
		res.status(200).json(ApiResponse.ok("Role updated", user))
	}),

	suspendUser: asyncHandler(async (req: Request, res: Response) => {
		const result = await adminService.suspendUser(req.params.id)
		res.status(200).json(ApiResponse.ok("User suspended", result))
	}),

	unsuspendUser: asyncHandler(async (req: Request, res: Response) => {
		const result = await adminService.unsuspendUser(req.params.id)
		res.status(200).json(ApiResponse.ok("User unsuspended", result))
	}),

	deleteUser: asyncHandler(async (req: Request, res: Response) => {
		const result = await adminService.deleteUser(req.params.id)
		res.status(200).json(ApiResponse.ok("User deleted", result))
	}),

	getAnalytics: asyncHandler(async (req: Request, res: Response) => {
		const { days } = req.query as { days?: string }
		const result = await adminService.getAnalytics(days ? Number(days) : 30)
		res.status(200).json(ApiResponse.ok("Analytics fetched", result))
	}),
}
