import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { roomsService } from "./rooms.service"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"

export const roomsController = {
	createRoom: asyncHandler(async (req: Request, res: Response) => {
		const room = await roomsService.createRoom(req.user!.id, req.body)
		getIO()?.emit(SOCKET_EVENTS.ROOM_CREATED, { room })
		res.status(201).json(ApiResponse.ok("Room created", room))
	}),

	listRooms: asyncHandler(async (req: Request, res: Response) => {
		const { q, category, visibility, pinned, recentlyJoined, isDirect, page, limit } = req.query as Record<string, string>
		const result = await roomsService.listRooms(
			req.user!.id,
			{ q, category, visibility: visibility as "PUBLIC" | "PRIVATE", pinned, recentlyJoined, isDirect },
			{ page, limit },
		)
		res.status(200).json(ApiResponse.ok("Rooms fetched", result))
	}),

	getRoom: asyncHandler(async (req: Request, res: Response) => {
		const room = await roomsService.getRoom(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Room fetched", room))
	}),

	updateRoom: asyncHandler(async (req: Request, res: Response) => {
		const room = await roomsService.updateRoom(req.user!.id, req.params.id, req.body)
		getIO()?.to(`room:${req.params.id}`).emit(SOCKET_EVENTS.ROOM_UPDATED, { room })
		res.status(200).json(ApiResponse.ok("Room updated", room))
	}),

	deleteRoom: asyncHandler(async (req: Request, res: Response) => {
		const result = await roomsService.deleteRoom(req.user!.id, req.params.id)
		getIO()?.to(`room:${req.params.id}`).emit(SOCKET_EVENTS.ROOM_DELETED, { roomId: req.params.id })
		res.status(200).json(ApiResponse.ok("Room deleted", result))
	}),

	joinRoom: asyncHandler(async (req: Request, res: Response) => {
		const result = await roomsService.joinRoom(req.user!.id, req.params.id, req.body)
		res.status(200).json(ApiResponse.ok("Joined room", result))
	}),

	leaveRoom: asyncHandler(async (req: Request, res: Response) => {
		const result = await roomsService.leaveRoom(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Left room", result))
	}),
}
