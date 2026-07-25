import { Router } from "express"
import { authRoutes } from "../modules/auth/auth.routes"
import { usersRoutes } from "../modules/users/users.routes"
import { roomsRoutes } from "../modules/rooms/rooms.routes"
import { messagesRoutes } from "../modules/messages/messages.routes"
import { notificationsRoutes } from "../modules/notifications/notifications.routes"
import { adminRoutes } from "../modules/admin/admin.routes"
import { auditRoutes } from "../modules/audit/audit.routes"
import { invitesRoutes } from "../modules/invites/invites.routes"
import { reportsRoutes } from "../modules/reports/reports.routes"
import { ApiResponse } from "../utils/ApiResponse"

const router = Router()

router.get("/health", (_req, res) => {
	res.status(200).json(ApiResponse.ok("Ripple Chat API is healthy", { uptime: process.uptime() }))
})

router.use("/auth", authRoutes)
router.use("/users", usersRoutes)
router.use("/rooms", roomsRoutes)
router.use("/messages", messagesRoutes)
router.use("/notifications", notificationsRoutes)
router.use("/admin", adminRoutes)
router.use("/audit", auditRoutes)
router.use("/invites", invitesRoutes)
router.use("/reports", reportsRoutes)

export { router as apiRouter }
