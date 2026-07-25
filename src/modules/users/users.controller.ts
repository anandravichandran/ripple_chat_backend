import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiError } from "../../utils/ApiError"
import { ApiResponse } from "../../utils/ApiResponse"
import { usersService } from "./users.service"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"

export const usersController = {
	getMe: asyncHandler(async (req: Request, res: Response) => {
		const user = await usersService.getMe(req.user!.id)
		res.status(200).json(ApiResponse.ok("Profile fetched", user))
	}),

	updateMe: asyncHandler(async (req: Request, res: Response) => {
		const user = await usersService.updateMe(req.user!.id, req.body)
		getIO()?.emit(SOCKET_EVENTS.USER_UPDATED, { user })
		res.status(200).json(ApiResponse.ok("Profile updated", user))
	}),

	updateAvatar: asyncHandler(async (req: Request, res: Response) => {
		const user = await usersService.updateAvatar(req.user!.id, req.file)
		getIO()?.emit(SOCKET_EVENTS.USER_UPDATED, { user })
		res.status(200).json(ApiResponse.ok("Avatar updated", user))
	}),

	updateBanner: asyncHandler(async (req: Request, res: Response) => {
		const user = await usersService.updateBanner(req.user!.id, req.file)
		getIO()?.emit(SOCKET_EVENTS.USER_UPDATED, { user })
		res.status(200).json(ApiResponse.ok("Banner updated", user))
	}),

	searchUsers: asyncHandler(async (req: Request, res: Response) => {
		const { q, page, limit } = req.query as { q?: string; page?: string; limit?: string }
		const result = await usersService.searchUsers(q, { page, limit })
		res.status(200).json(ApiResponse.ok("Users fetched", result))
	}),

	getSessions: asyncHandler(async (req: Request, res: Response) => {
		const sessions = await usersService.getSessionsAndDevices(req.user!.id)
		res.status(200).json(ApiResponse.ok("Sessions fetched", { sessions }))
	}),

	getUserById: asyncHandler(async (req: Request, res: Response) => {
		const user = await usersService.getUserById(req.params.id)
		if (!user) throw new ApiError(404, "User not found")
		res.status(200).json(ApiResponse.ok("User fetched", user))
	}),
}
