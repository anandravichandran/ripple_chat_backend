import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { ApiError } from "../../utils/ApiError"
import { messagesService } from "./messages.service"
import { uploadImageBuffer, uploadFileBuffer } from "../upload/upload.service"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"

export const messagesController = {
	listMessages: asyncHandler(async (req: Request, res: Response) => {
		const { cursor, limit, q } = req.query as { cursor?: string; limit?: string; q?: string }
		const result = await messagesService.listMessages(req.user!.id, req.params.id, {
			cursor,
			limit: limit ? Number(limit) : undefined,
			q,
		})
		res.status(200).json(ApiResponse.ok("Messages fetched", result))
	}),

	listPinned: asyncHandler(async (req: Request, res: Response) => {
		const pinned = await messagesService.listPinned(req.user!.id, req.params.id)
		res.status(200).json(ApiResponse.ok("Pinned messages fetched", pinned))
	}),

	createMessage: asyncHandler(async (req: Request, res: Response) => {
		const roomId = req.params.id
		const message = await messagesService.createMessage(req.user!.id, roomId, req.body)
		getIO()?.to(`room:${roomId}`).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, { message })
		res.status(201).json(ApiResponse.ok("Message sent", message))
	}),

	uploadAttachment: asyncHandler(async (req: Request, res: Response) => {
		if (!req.file) throw ApiError.badRequest("No file provided")
		const isImage = req.file.mimetype.startsWith("image/")
		const uploaded = isImage
			? await uploadImageBuffer(req.file.buffer, req.file.mimetype, "messages")
			: await uploadFileBuffer(req.file.buffer, req.file.mimetype, "messages", req.file.originalname)

		res.status(200).json(
			ApiResponse.ok("File uploaded", {
				url: uploaded.url,
				publicId: uploaded.publicId,
				fileName: req.file.originalname,
				fileType: req.file.mimetype,
				fileSize: req.file.size,
				width: uploaded.width,
				height: uploaded.height,
			}),
		)
	}),

	updateMessage: asyncHandler(async (req: Request, res: Response) => {
		const message = await messagesService.updateMessage(req.user!.id, req.params.id, req.body)
		if (message?.roomId) {
			getIO()?.to(`room:${message.roomId}`).emit(SOCKET_EVENTS.MESSAGE_EDITED, { message })
		}
		res.status(200).json(ApiResponse.ok("Message updated", message))
	}),

	deleteMessage: asyncHandler(async (req: Request, res: Response) => {
		const message = await messagesService.deleteMessage(req.user!.id, req.params.id)
		getIO()?.to(`room:${message.roomId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId: message.id, roomId: message.roomId })
		res.status(200).json(ApiResponse.ok("Message deleted", { id: message.id }))
	}),

	react: asyncHandler(async (req: Request, res: Response) => {
		const message = await messagesService.react(req.user!.id, req.params.id, req.body.emoji)
		if (message?.roomId) {
			getIO()?.to(`room:${message.roomId}`).emit(SOCKET_EVENTS.MESSAGE_EDITED, { message })
		}
		res.status(200).json(ApiResponse.ok("Reaction updated", message))
	}),

	markDelivered: asyncHandler(async (req: Request, res: Response) => {
		const message = await messagesService.markDelivered(req.user!.id, req.params.id)
		getIO()?.to(`room:${message.roomId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId: message.id })
		res.status(200).json(ApiResponse.ok("Marked delivered", message))
	}),

	searchGlobal: asyncHandler(async (req: Request, res: Response) => {
		const { q, limit, roomId } = req.query as { q?: string; limit?: string; roomId?: string }
		if (!q || q.length < 2) throw ApiError.badRequest("Query must be at least 2 characters")
		const result = await messagesService.searchGlobal(req.user!.id, q, {
			limit: limit ? Number(limit) : 20,
			roomId,
		})
		res.status(200).json(ApiResponse.ok("Search results", result))
	}),
}
