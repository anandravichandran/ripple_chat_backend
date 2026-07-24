import type { NextFunction, Request, Response } from "express"
import { ApiError } from "../utils/ApiError"
import { verifyAccessToken } from "../utils/jwt"
import { asyncHandler } from "../utils/asyncHandler"
import { prisma } from "../database/prisma"

function extractBearerToken(req: Request): string | null {
	const header = req.headers.authorization
	if (header?.startsWith("Bearer ")) return header.slice(7)
	return null
}

/**
 * Requires a valid access token (sent as `Authorization: Bearer <token>`).
 * The access token is intentionally NOT read from cookies — the frontend
 * keeps it in memory only, per the security spec.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
	const token = extractBearerToken(req)
	if (!token) throw ApiError.unauthorized("Missing access token")

	let payload
	try {
		payload = verifyAccessToken(token)
	} catch {
		throw ApiError.unauthorized("Access token is invalid or expired")
	}

	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
		select: { id: true, role: true, username: true, isVerified: true },
	})
	if (!user) throw ApiError.unauthorized("User no longer exists")
	if (!user.isVerified) throw ApiError.forbidden("Please verify your email to continue")

	req.user = { id: user.id, role: user.role, username: user.username }
	next()
})

/** Best-effort auth: attaches req.user if a valid token is present, otherwise continues. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
	const token = extractBearerToken(req)
	if (!token) return next()
	try {
		const payload = verifyAccessToken(token)
		const user = await prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, role: true, username: true },
		})
		if (user) req.user = { id: user.id, role: user.role, username: user.username }
	} catch {
		// ignore invalid token in optional mode
	}
	next()
})
