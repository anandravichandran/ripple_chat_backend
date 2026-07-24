import rateLimit from "express-rate-limit"
import { env } from "../config/env"
import { ApiResponse } from "../utils/ApiResponse"

function jsonHandler(_req: unknown, res: import("express").Response) {
	res.status(429).json(ApiResponse.fail("Too many requests. Please try again later."))
}

/** Global limiter applied to the whole API. */
export const globalRateLimiter = rateLimit({
	windowMs: env.RATE_LIMIT_WINDOW_MS,
	max: env.RATE_LIMIT_MAX,
	standardHeaders: true,
	legacyHeaders: false,
	handler: jsonHandler,
})

/** Stricter limiter for auth endpoints to slow down brute force / OTP abuse. */
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	handler: jsonHandler,
})

/** Very strict limiter for OTP / password reset requests. */
export const otpRateLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	handler: jsonHandler,
})
