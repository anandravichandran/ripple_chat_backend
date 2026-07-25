import { Router } from "express"
import { reportsController } from "./reports.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { requireAdmin } from "../../middlewares/role.middleware"

const router = Router()
router.use(requireAuth)

router.post("/", reportsController.create)
router.get("/", requireAdmin, reportsController.list)
router.post("/:id/resolve", requireAdmin, reportsController.resolve)
router.post("/:id/dismiss", requireAdmin, reportsController.dismiss)

export { router as reportsRoutes }
