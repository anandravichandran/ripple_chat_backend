import type { Socket } from "socket.io"
import { verifyAccessToken } from "../../utils/jwt"
import { prisma } from "../../database/prisma"
import { socketLogger } from "../../config/logger"

type NextFn = (err?: Error) => void

/**
 * Authenticates a socket handshake using the same JWT access token the
 * frontend keeps in memory. Unauthorized sockets are rejected before any
 * event handlers are attached.
 */
export async function socketAuthMiddleware(socket: Socket, next: NextFn) {
	try {
		const token =
			(socket.handshake.auth?.token as string | undefined) ??
			(socket.handshake.headers.authorization?.toString().replace("Bearer ", "") as string | undefined)

		if (!token) {
			socketLogger.warn("Socket connection rejected: missing token")
			return next(new Error("UNAUTHORIZED"))
		}

		const payload = verifyAccessToken(token)
		const user = await prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, username: true, role: true, isVerified: true },
		})

		if (!user || !user.isVerified) {
			socketLogger.warn("Socket connection rejected: invalid or unverified user")
			return next(new Error("UNAUTHORIZED"))
		}

		socket.data.userId = user.id
		socket.data.username = user.username
		socket.data.role = user.role
		next()
	} catch {
		socketLogger.warn("Socket connection rejected: invalid token")
		next(new Error("UNAUTHORIZED"))
	}
}
