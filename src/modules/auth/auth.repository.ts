import { prisma } from "../../database/prisma"
import type { OTPPurpose } from "@prisma/client"

export const authRepository = {
	findUserByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
	findUserByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
	findUserById: (id: string) => prisma.user.findUnique({ where: { id } }),

	createUser: (data: { name: string; username: string; email: string; passwordHash: string }) =>
		prisma.user.create({ data }),

	markUserVerified: (userId: string) =>
		prisma.user.update({ where: { id: userId }, data: { isVerified: true } }),

	updateLastLogin: (userId: string) =>
		prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date(), status: "ONLINE" } }),

	updatePassword: (userId: string, passwordHash: string) =>
		prisma.user.update({ where: { id: userId }, data: { passwordHash } }),

	// --- OTP ---
	createOtp: (data: { userId: string; codeHash: string; expiresAt: Date; purpose?: OTPPurpose }) =>
		prisma.oTPVerification.create({ data }),

	invalidatePendingOtps: (userId: string, purpose: OTPPurpose = "EMAIL_VERIFICATION") =>
		prisma.oTPVerification.updateMany({
			where: { userId, purpose, consumedAt: null },
			data: { consumedAt: new Date() },
		}),

	latestActiveOtp: (userId: string, purpose: OTPPurpose = "EMAIL_VERIFICATION") =>
		prisma.oTPVerification.findFirst({
			where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
			orderBy: { createdAt: "desc" },
		}),

	incrementOtpAttempts: (id: string) =>
		prisma.oTPVerification.update({ where: { id }, data: { attempts: { increment: 1 } } }),

	consumeOtp: (id: string) => prisma.oTPVerification.update({ where: { id }, data: { consumedAt: new Date() } }),

	// --- Refresh tokens ---
	createRefreshToken: (data: {
		userId: string
		tokenHash: string
		family: string
		expiresAt: Date
		userAgent?: string | null
		ip?: string | null
	}) => prisma.refreshToken.create({ data }),

	findRefreshTokenByHash: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

	revokeRefreshToken: (tokenHash: string, replacedByTokenHash?: string) =>
		prisma.refreshToken.update({
			where: { tokenHash },
			data: { revoked: true, replacedByTokenHash: replacedByTokenHash ?? null },
		}),

	revokeFamily: (family: string) =>
		prisma.refreshToken.updateMany({ where: { family, revoked: false }, data: { revoked: true } }),

	// --- Password reset ---
	invalidatePendingResets: (userId: string) =>
		prisma.passwordReset.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } }),

	createPasswordReset: (data: { userId: string; tokenHash: string; expiresAt: Date }) =>
		prisma.passwordReset.create({ data }),

	findActivePasswordReset: (tokenHash: string) =>
		prisma.passwordReset.findFirst({
			where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
		}),

	consumePasswordReset: (id: string) =>
		prisma.passwordReset.update({ where: { id }, data: { consumedAt: new Date() } }),

	// --- Sessions / devices ---
	createSession: (data: {
		userId: string
		deviceId?: string | null
		refreshFamily: string
		ip?: string | null
		userAgent?: string | null
	}) => prisma.session.create({ data }),

	upsertDevice: (data: { userId: string; type: "DESKTOP" | "MOBILE" | "TABLET"; name?: string | null }) =>
		prisma.device.create({ data }),
}
