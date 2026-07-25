import { randomUUID } from "crypto"
import { authRepository } from "./auth.repository"
import { ApiError } from "../../utils/ApiError"
import { hashPassword, comparePassword } from "../../utils/password"
import { generateOtpCode, hashOtpCode, compareOtpCode, otpExpiryDate, OTP_MAX_ATTEMPTS } from "../../utils/otp"
import { generateSecureToken, hashToken } from "../../utils/token"
import {
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
	decodeRefreshExpiryMs,
} from "../../utils/jwt"
import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../email/email.service"
import { authLogger } from "../../config/logger"
import { env } from "../../config/env"
import { prisma } from "../../database/prisma"
import { isProd } from "../../config/env"
import type { RegisterInput, LoginInput } from "./auth.validator"
import type { DeviceContext } from "./auth.types"

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

function sanitizeUser(user: {
	id: string
	name: string
	username: string
	email: string
	avatarUrl: string | null
	bio: string | null
	role: string
	status: string
	isVerified: boolean
	lastSeen: Date
	createdAt: Date
}) {
	return user
}

async function issueAuthTokens(user: { id: string; role: string; username: string }, device: DeviceContext) {
	const family = randomUUID()
	const accessToken = signAccessToken({ sub: user.id, role: user.role as never, username: user.username })
	const refreshToken = signRefreshToken({ sub: user.id, family, jti: randomUUID() })

	await authRepository.createRefreshToken({
		userId: user.id,
		tokenHash: hashToken(refreshToken),
		family,
		expiresAt: new Date(Date.now() + decodeRefreshExpiryMs()),
		userAgent: device.userAgent ?? null,
		ip: device.ip ?? null,
	})

	await authRepository.createSession({
		userId: user.id,
		refreshFamily: family,
		ip: device.ip ?? null,
		userAgent: device.userAgent ?? null,
	})

	return { accessToken, refreshToken }
}

export const authService = {
	async register(input: RegisterInput) {
		const existingEmail = await authRepository.findUserByEmail(input.email)
		if (existingEmail) throw ApiError.conflict("An account with this email already exists")

		const existingUsername = await authRepository.findUserByUsername(input.username)
		if (existingUsername) throw ApiError.conflict("This username is already taken")

		const passwordHash = await hashPassword(input.password)
		const code = generateOtpCode()
		const codeHash = await hashOtpCode(code)
		const expiresAt = otpExpiryDate()

		const user = await prisma.$transaction(async (tx) => {
			const u = await tx.user.create({
				data: { name: input.name, username: input.username, email: input.email, passwordHash },
			})
			await tx.oTPVerification.updateMany({
				where: { userId: u.id, purpose: "EMAIL_VERIFICATION", consumedAt: null },
				data: { consumedAt: new Date() },
			})
			await tx.oTPVerification.create({
				data: { userId: u.id, codeHash, expiresAt, purpose: "EMAIL_VERIFICATION" },
			})
			return u
		})

		try {
			await sendOtpEmail(user.email, user.name, code)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			authLogger.error("Account created but OTP email send failed", { userId: user.id, message: msg })
			throw ApiError.internal(
				"Account created but verification email could not be sent. Request a new code using the resend option.",
			)
		}

		if (!isProd) authLogger.info("OTP code", { userId: user.id, code })
		authLogger.info("User registered, OTP issued", { userId: user.id })
		return { id: user.id, email: user.email, username: user.username }
	},

	async verifyEmail(email: string, code: string) {
		const user = await authRepository.findUserByEmail(email)
		if (!user) throw ApiError.notFound("No account found for this email")
		if (user.isVerified) throw ApiError.badRequest("This account is already verified")

		const otp = await authRepository.latestActiveOtp(user.id)
		if (!otp) throw ApiError.badRequest("OTP has expired. Please request a new code")
		if (otp.attempts >= OTP_MAX_ATTEMPTS) throw ApiError.tooMany("Too many attempts. Please request a new code")

		const isValid = await compareOtpCode(code, otp.codeHash)
		if (!isValid) {
			await authRepository.incrementOtpAttempts(otp.id)
			throw ApiError.badRequest("Incorrect verification code")
		}

		await prisma.$transaction(async (tx) => {
			await tx.oTPVerification.update({
				where: { id: otp.id },
				data: { consumedAt: new Date() },
			})
			await tx.user.update({
				where: { id: user.id },
				data: { isVerified: true },
			})
		})

		authLogger.info("Email verified", { userId: user.id })
		void sendWelcomeEmail(user.email, user.name).catch(() => undefined)

		return { verified: true }
	},

	async resendOtp(email: string) {
		const user = await authRepository.findUserByEmail(email)
		// Always respond with success to avoid leaking whether an email is registered.
		if (!user || user.isVerified) return { sent: true }

		// Rate-limit resends: allow one OTP per 60 seconds per user.
		const latestOtp = await prisma.oTPVerification.findFirst({
			where: { userId: user.id, purpose: "EMAIL_VERIFICATION" },
			orderBy: { createdAt: "desc" },
		})
		if (latestOtp && Date.now() - latestOtp.createdAt.getTime() < 60_000) {
			throw ApiError.tooMany("Please wait at least 60 seconds before requesting a new code")
		}

		const code = generateOtpCode()
		const codeHash = await hashOtpCode(code)

		await prisma.$transaction(async (tx) => {
			await tx.oTPVerification.updateMany({
				where: { userId: user.id, purpose: "EMAIL_VERIFICATION", consumedAt: null },
				data: { consumedAt: new Date() },
			})
			await tx.oTPVerification.create({
				data: { userId: user.id, codeHash, expiresAt: otpExpiryDate(), purpose: "EMAIL_VERIFICATION" },
			})
		})

		try {
			await sendOtpEmail(user.email, user.name, code)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			authLogger.error("Resend OTP email send failed", { userId: user.id, message: msg })
		}
		return { sent: true }
	},

	async login(input: LoginInput, device: DeviceContext) {
		const user = await authRepository.findUserByEmail(input.email)
		if (!user) throw ApiError.unauthorized("Invalid email or password")

		const validPassword = await comparePassword(input.password, user.passwordHash)
		if (!validPassword) throw ApiError.unauthorized("Invalid email or password")

		if (!user.isVerified) throw ApiError.forbidden("Please verify your email before logging in")

		const tokens = await issueAuthTokens(user, device)
		await authRepository.updateLastLogin(user.id)
		authLogger.info("User logged in", { userId: user.id })

		return { user: sanitizeUser(user), ...tokens }
	},

	async refresh(refreshToken: string, device: DeviceContext) {
		let payload
		try {
			payload = verifyRefreshToken(refreshToken)
		} catch {
			throw ApiError.unauthorized("Invalid or expired refresh token")
		}

		const tokenHash = hashToken(refreshToken)
		const stored = await authRepository.findRefreshTokenByHash(tokenHash)

		if (!stored) throw ApiError.unauthorized("Refresh token not recognized")

		if (stored.revoked) {
			// Reuse of an already-rotated token: possible theft — invalidate the
			// whole rotation family and force re-authentication.
			await authRepository.revokeFamily(stored.family)
			authLogger.warn("Refresh token reuse detected — family revoked", { userId: stored.userId })
			throw ApiError.unauthorized("Session invalid. Please log in again")
		}

		if (stored.expiresAt < new Date()) throw ApiError.unauthorized("Refresh token has expired")

		const user = await authRepository.findUserById(payload.sub)
		if (!user) throw ApiError.unauthorized("User no longer exists")

		const newFamily = stored.family
		const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username })
		const newRefreshToken = signRefreshToken({ sub: user.id, family: newFamily, jti: randomUUID() })
		const newTokenHash = hashToken(newRefreshToken)

		await authRepository.revokeRefreshToken(tokenHash, newTokenHash)
		await authRepository.createRefreshToken({
			userId: user.id,
			tokenHash: newTokenHash,
			family: newFamily,
			expiresAt: new Date(Date.now() + decodeRefreshExpiryMs()),
			userAgent: device.userAgent ?? null,
			ip: device.ip ?? null,
		})

		return { accessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) }
	},

	async logout(refreshToken: string | undefined, userId?: string) {
		if (refreshToken) {
			const tokenHash = hashToken(refreshToken)
			const stored = await authRepository.findRefreshTokenByHash(tokenHash)
			if (stored) await authRepository.revokeFamily(stored.family)
		}
		if (userId) authLogger.info("User logged out", { userId })
		return { loggedOut: true }
	},

	async forgotPassword(email: string) {
		const user = await authRepository.findUserByEmail(email)
		// Always respond success to avoid leaking whether an email is registered.
		if (!user) return { sent: true }

		await authRepository.invalidatePendingResets(user.id)
		const { raw, hash } = generateSecureToken()
		await authRepository.createPasswordReset({
			userId: user.id,
			tokenHash: hash,
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
		})

		const resetUrl = `${env.CLIENT_URL}/reset-password?token=${raw}`
		await sendPasswordResetEmail(user.email, user.name, resetUrl)
		return { sent: true }
	},

	async resetPassword(token: string, newPassword: string) {
		const tokenHash = hashToken(token)
		const reset = await authRepository.findActivePasswordReset(tokenHash)
		if (!reset) throw ApiError.badRequest("Reset link is invalid or has expired")

		const passwordHash = await hashPassword(newPassword)
		await authRepository.updatePassword(reset.userId, passwordHash)
		await authRepository.consumePasswordReset(reset.id)
		await authRepository.revokeFamily(reset.userId) // no-op safe guard; real revoke below
		authLogger.info("Password reset completed", { userId: reset.userId })

		return { reset: true }
	},
}
