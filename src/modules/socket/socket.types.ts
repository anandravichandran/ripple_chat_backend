import type { Socket } from "socket.io"

export type AuthenticatedSocketData = {
	userId: string
	username: string
	role: "USER" | "MODERATOR" | "ADMIN"
}

export type AppSocket = Socket & { data: AuthenticatedSocketData }
