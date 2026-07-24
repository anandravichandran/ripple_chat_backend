import { createApp } from "../src/app"
import { connectDatabase } from "../src/database/prisma"
import { verifySmtpConnection } from "../src/modules/email/email.service"
import { logger } from "../src/config/logger"

let handler: ((req: any, res: any) => void) | null = null

async function ensureInit() {
	const app = createApp()

	await connectDatabase()
	await verifySmtpConnection()

	logger.info("Vercel serverless function initialized")
	handler = app
}

// Vercel serverless function entry point.
export default async function vercelHandler(req: any, res: any) {
	if (!handler) {
		try {
			await ensureInit()
		} catch (err) {
			logger.error("Failed to initialize serverless function", { err })
			res.status(500).json({ success: false, message: "Server initialization failed" })
			return
		}
	}
	handler(req, res)
}
