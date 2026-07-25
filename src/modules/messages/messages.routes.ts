import { Router } from "express"
import { messagesController } from "./messages.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { validate } from "../../middlewares/validate.middleware"
import { uploadAttachment } from "../../middlewares/upload.middleware"
import {
	createMessageSchema,
	updateMessageSchema,
	listMessagesQuerySchema,
	reactSchema,
	uuidParamSchema,
} from "./messages.validator"

// Mounted at /rooms/:id/messages (merged params) — GET list / POST create / upload / pinned.
const nestedRouter = Router({ mergeParams: true })
nestedRouter.use(requireAuth)
nestedRouter.get("/", validate({ query: listMessagesQuerySchema }), messagesController.listMessages)
nestedRouter.post("/", validate({ body: createMessageSchema }), messagesController.createMessage)
nestedRouter.get("/pinned", messagesController.listPinned)
nestedRouter.post("/attachments", uploadAttachment, messagesController.uploadAttachment)

// Mounted at /messages — PATCH/DELETE by id, plus reactions and receipts.
const flatRouter = Router()
flatRouter.use(requireAuth)
flatRouter.patch("/:id", validate({ params: uuidParamSchema, body: updateMessageSchema }), messagesController.updateMessage)
flatRouter.delete("/:id", validate({ params: uuidParamSchema }), messagesController.deleteMessage)
flatRouter.post("/:id/reactions", validate({ params: uuidParamSchema, body: reactSchema }), messagesController.react)
flatRouter.post("/:id/delivered", validate({ params: uuidParamSchema }), messagesController.markDelivered)
flatRouter.get("/search/global", messagesController.searchGlobal)

export { nestedRouter as messagesRoutesForRoom, flatRouter as messagesRoutes }
