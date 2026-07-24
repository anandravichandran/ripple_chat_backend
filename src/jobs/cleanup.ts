import cron from "node-cron"
import { prisma } from "../database/prisma"
import { logger } from "../config/logger"

const EXPIRY_DAYS = 30

async function cleanupExpiredRecords() {
	const cutoff = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000)

	const [deletedOtps, deletedResets, deletedTokens] = await Promise.all([
		prisma.oTPVerification.deleteMany({
			where: { createdAt: { lt: cutoff } },
		}),
		prisma.passwordReset.deleteMany({
			where: { createdAt: { lt: cutoff } },
		}),
		prisma.refreshToken.deleteMany({
			where: { createdAt: { lt: cutoff } },
		}),
	])

	logger.info("Cleanup completed", {
		otpVerifications: deletedOtps.count,
		passwordResets: deletedResets.count,
		refreshTokens: deletedTokens.count,
	})
}

export function startCleanupJob() {
	cron.schedule("0 * * * *", () => {
		cleanupExpiredRecords().catch((err) =>
			logger.error("Cleanup job failed", { err }),
		)
	})
	logger.info("Cleanup job scheduled (every hour)")
}
