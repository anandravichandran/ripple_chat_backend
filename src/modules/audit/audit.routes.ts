import { Router } from "express"
import { auditController } from "./audit.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { requireAdmin } from "../../middlewares/role.middleware"

const router = Router()
router.use(requireAuth, requireAdmin)
router.get("/", auditController.list)

export { router as auditRoutes }
