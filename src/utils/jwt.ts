import jwt, { type SignOptions } from "jsonwebtoken"
import { env } from "../config/env"

export type AccessTokenPayload = {
	sub: string // userId
	role: "USER" | "MODERATOR" | "ADMIN"
	username: string
}

export type RefreshTokenPayload = {
	sub: string // userId
	family: string // rotation family id
	jti: string // unique token id
}

export function signAccessToken(payload: AccessTokenPayload): string {
	return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_EXPIRES,
	} as SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
	return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
	return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
		expiresIn: env.JWT_REFRESH_EXPIRES,
	} as SignOptions)
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
	return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

export function decodeRefreshExpiryMs(): number {
	// Converts strings like "7d", "15m" to milliseconds for DB expiry storage.
	const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES)
	if (!match) return 7 * 24 * 60 * 60 * 1000
	const value = Number(match[1])
	const unit = match[2]
	const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000
	return value * unitMs
}
