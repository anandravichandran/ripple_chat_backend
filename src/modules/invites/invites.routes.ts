import { Router } from "express"
import { invitesController } from "./invites.controller"
import { requireAuth } from "../../middlewares/auth.middleware"

const router = Router()
router.use(requireAuth)

router.get("/", invitesController.listMyInvites)
router.post("/:roomId/invite", invitesController.invite)
router.get("/room/:roomId", invitesController.listRoomInvites)
router.post("/:id/accept", invitesController.accept)
router.post("/:id/decline", invitesController.decline)
router.post("/:id/cancel", invitesController.cancel)

export { router as invitesRoutes }
