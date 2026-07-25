import { Router } from "express"
import { adminController } from "./admin.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { requireAdmin } from "../../middlewares/role.middleware"
import { validate } from "../../middlewares/validate.middleware"
import { listUsersQuerySchema, updateUserRoleSchema, analyticsQuerySchema } from "./admin.validator"

const router = Router()

router.use(requireAuth, requireAdmin)

router.get("/analytics", validate({ query: analyticsQuerySchema }), adminController.getAnalytics)
router.get("/users", validate({ query: listUsersQuerySchema }), adminController.listUsers)
router.get("/users/:id", adminController.getUser)
router.patch("/users/:id/role", validate({ body: updateUserRoleSchema }), adminController.updateUserRole)
router.post("/users/:id/suspend", adminController.suspendUser)
router.post("/users/:id/unsuspend", adminController.unsuspendUser)
router.delete("/users/:id", adminController.deleteUser)

export { router as adminRoutes }
