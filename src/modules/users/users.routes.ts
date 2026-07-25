import { Router } from "express"
import { usersController } from "./users.controller"
import { requireAuth } from "../../middlewares/auth.middleware"
import { validate } from "../../middlewares/validate.middleware"
import { uploadAvatar } from "../../middlewares/upload.middleware"
import { updateProfileSchema, userSearchQuerySchema } from "./users.validator"

const router = Router()

router.use(requireAuth)

router.get("/me", usersController.getMe)
router.patch("/me", validate({ body: updateProfileSchema }), usersController.updateMe)
router.patch("/avatar", uploadAvatar, usersController.updateAvatar)
router.patch("/banner", uploadAvatar, usersController.updateBanner)
router.get("/search", validate({ query: userSearchQuerySchema }), usersController.searchUsers)
router.get("/me/sessions", usersController.getSessions)
router.get("/:id", usersController.getUserById)

export { router as usersRoutes }
