import http from "http"
import { createApp } from "./app"
import { env } from "./config/env"
import { logger } from "./config/logger"
import { connectDatabase, disconnectDatabase } from "./database/prisma"
import { initSocket } from "./modules/socket/socket.server"
import { verifySmtpConnection } from "./modules/email/email.service"
import { startCleanupJob } from "./jobs/cleanup"

async function bootstrap() {
	await connectDatabase()
	await verifySmtpConnection()
	startCleanupJob()

	const app = createApp()
	const httpServer = http.createServer(app)

	initSocket(httpServer)

	httpServer.listen(env.PORT, () => {
		logger.info(`🚀 Ripple Chat API listening on ${env.SERVER_URL} (port ${env.PORT}, ${env.NODE_ENV})`)
	})

	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}. Shutting down gracefully...`)
		httpServer.close(async () => {
			await disconnectDatabase()
			process.exit(0)
		})
		// Force-exit if graceful shutdown hangs.
		setTimeout(() => process.exit(1), 10_000).unref()
	}

	process.on("SIGINT", () => shutdown("SIGINT"))
	process.on("SIGTERM", () => shutdown("SIGTERM"))
	process.on("unhandledRejection", (reason) => {
		logger.error("Unhandled promise rejection", { reason })
	})
	process.on("uncaughtException", (err) => {
		logger.error("Uncaught exception", { message: err.message, stack: err.stack })
		process.exit(1)
	})
}

bootstrap().catch((err) => {
	logger.error("Failed to start server", { err })
	process.exit(1)
})
