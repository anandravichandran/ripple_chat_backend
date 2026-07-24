import { Router } from "express"
import { roomsController } from "./rooms.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { validate } from "../../middlewares/validate.middleware"
import {
	createRoomSchema,
	updateRoomSchema,
	listRoomsQuerySchema,
	joinRoomSchema,
	uuidParamSchema,
} from "./rooms.validator"
import { messagesRoutesForRoom } from "../messages/messages.routes"

const router = Router()

router.use(requireAuth)

router.post("/", validate({ body: createRoomSchema }), roomsController.createRoom)
router.get("/", validate({ query: listRoomsQuerySchema }), roomsController.listRooms)
router.get("/:id", validate({ params: uuidParamSchema }), roomsController.getRoom)
router.patch("/:id", validate({ params: uuidParamSchema, body: updateRoomSchema }), roomsController.updateRoom)
router.delete("/:id", validate({ params: uuidParamSchema }), roomsController.deleteRoom)
router.post("/:id/join", validate({ params: uuidParamSchema, body: joinRoomSchema }), roomsController.joinRoom)
router.post("/:id/leave", validate({ params: uuidParamSchema }), roomsController.leaveRoom)

// Nested message routes: GET/POST /rooms/:id/messages
router.use("/:id/messages", messagesRoutesForRoom)

export { router as roomsRoutes }
