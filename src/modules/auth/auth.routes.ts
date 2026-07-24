import { Router } from "express"
import { authController } from "./auth.controller"
import { validate } from "../../middlewares/validate.middleware"
import { authRateLimiter, otpRateLimiter } from "../../middlewares/rateLimiter.middleware"
import { requireAuth } from "../../middlewares/auth.middleware"
import {
	registerSchema,
	verifyEmailSchema,
	resendOtpSchema,
	loginSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
} from "./auth.validator"

const router = Router()

router.post("/register", authRateLimiter, validate({ body: registerSchema }), authController.register)
router.post("/verify-email", authRateLimiter, validate({ body: verifyEmailSchema }), authController.verifyEmail)
router.post("/resend-otp", otpRateLimiter, validate({ body: resendOtpSchema }), authController.resendOtp)
router.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login)
router.post("/refresh", authController.refresh)
router.post("/logout", requireAuth, authController.logout)
router.post(
	"/forgot-password",
	otpRateLimiter,
	validate({ body: forgotPasswordSchema }),
	authController.forgotPassword,
)
router.post("/reset-password", authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword)

export { router as authRoutes }
