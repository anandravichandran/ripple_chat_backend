import { Router } from "express"
import { notificationsController } from "./notifications.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { validate } from "../../middlewares/validate.middleware"
import { listNotificationsQuerySchema, uuidParamSchema } from "./notifications.validator"

const router = Router()

router.use(requireAuth)

router.get("/", validate({ query: listNotificationsQuerySchema }), notificationsController.list)
router.patch("/read-all", notificationsController.markAllRead)
router.patch("/:id/read", validate({ params: uuidParamSchema }), notificationsController.markRead)
router.delete("/:id", validate({ params: uuidParamSchema }), notificationsController.remove)

export { router as notificationsRoutes }
