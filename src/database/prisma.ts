import { PrismaClient } from "@prisma/client"
import { isProd } from "../config/env"
import { logger } from "../config/logger"

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: isProd
			? ["error", "warn"]
			: ["query", "info", "warn", "error"],
	})

if (!isProd) {
	globalForPrisma.prisma = prisma
}

export async function connectDatabase() {
	await prisma.$connect()
	logger.info("🐘 Connected to PostgreSQL via Prisma")
}

export async function disconnectDatabase() {
	await prisma.$disconnect()
	logger.info("PostgreSQL connection closed")
}
