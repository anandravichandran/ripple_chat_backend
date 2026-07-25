import type { Request, Response } from "express"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import { ApiError } from "../../utils/ApiError"
import { authService } from "./auth.service"
import { env, isProd } from "../../config/env"
import { getIO } from "../socket/socket.server"
import { SOCKET_EVENTS } from "../socket/socket.events"

const REFRESH_COOKIE = "refreshToken"

function refreshCookieOptions() {
	return {
		httpOnly: true,
		secure: isProd,
		sameSite: "strict" as const,
		domain: env.COOKIE_DOMAIN || undefined,
		path: "/",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	}
}

function deviceContext(req: Request) {
	return { userAgent: req.headers["user-agent"] ?? null, ip: req.ip ?? null }
}

export const authController = {
	register: asyncHandler(async (req: Request, res: Response) => {
		const result = await authService.register(req.body)
		getIO()?.emit(SOCKET_EVENTS.USER_CREATED, { user: result })
		res.status(201).json(ApiResponse.ok("Account created. Check your email for a verification code.", result))
	}),

	verifyEmail: asyncHandler(async (req: Request, res: Response) => {
		const { email, code } = req.body
		const result = await authService.verifyEmail(email, code)
		res.status(200).json(ApiResponse.ok("Email verified successfully", result))
	}),

	resendOtp: asyncHandler(async (req: Request, res: Response) => {
		const result = await authService.resendOtp(req.body.email)
		res.status(200).json(ApiResponse.ok("A new verification code has been sent", result))
	}),

	login: asyncHandler(async (req: Request, res: Response) => {
		const { user, accessToken, refreshToken } = await authService.login(req.body, deviceContext(req))
		res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
		res.status(200).json(ApiResponse.ok("Logged in successfully", { user, accessToken }))
	}),

	refresh: asyncHandler(async (req: Request, res: Response) => {
		const token = req.cookies?.[REFRESH_COOKIE]
		if (!token) throw ApiError.unauthorized("Missing refresh token")

		const { user, accessToken, refreshToken } = await authService.refresh(token, deviceContext(req))
		res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
		res.status(200).json(ApiResponse.ok("Token refreshed", { user, accessToken }))
	}),

	logout: asyncHandler(async (req: Request, res: Response) => {
		const token = req.cookies?.[REFRESH_COOKIE]
		await authService.logout(token, req.user?.id)
		res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined })
		res.status(200).json(ApiResponse.ok("Logged out successfully"))
	}),

	forgotPassword: asyncHandler(async (req: Request, res: Response) => {
		const result = await authService.forgotPassword(req.body.email)
		res.status(200).json(ApiResponse.ok("If an account exists, a reset link has been sent", result))
	}),

	resetPassword: asyncHandler(async (req: Request, res: Response) => {
		const { token, password } = req.body
		const result = await authService.resetPassword(token, password)
		res.status(200).json(ApiResponse.ok("Password reset successfully", result))
	}),
}
