import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { invitesService } from "./invites.service"

export const invitesController = {
	invite: asyncHandler(async (req: Request, res: Response) => {
		const invite = await invitesService.invite(req.user!.id, req.params.roomId, req.body.inviteeId, req.body.message)
		res.status(201).json(ApiResponse.ok("Invite sent", invite))
	}),

	accept: asyncHandler(async (req: Request, res: Response) => {
		const invite = await invitesService.accept(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Invite accepted", invite))
	}),

	decline: asyncHandler(async (req: Request, res: Response) => {
		const invite = await invitesService.decline(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Invite declined", invite))
	}),

	cancel: asyncHandler(async (req: Request, res: Response) => {
		const invite = await invitesService.cancel(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Invite cancelled", invite))
	}),

	listMyInvites: asyncHandler(async (req: Request, res: Response) => {
		const { status } = req.query as { status?: string }
		const invites = await invitesService.listMyInvites(req.user!.id, status)
		res.status(200).json(ApiResponse.ok("Invites fetched", invites))
	}),

	listRoomInvites: asyncHandler(async (req: Request, res: Response) => {
		const invites = await invitesService.listRoomInvites(req.user!.id, req.params.roomId)
		res.status(200).json(ApiResponse.ok("Room invites fetched", invites))
	}),
}
