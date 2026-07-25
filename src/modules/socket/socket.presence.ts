import { prisma } from "../../database/prisma"
import { socketLogger } from "../../config/logger"

/**
 * In-memory presence registry. Tracks every open socket per user so that a
 * user is only marked offline once ALL of their tabs/devices disconnect
 * ("Duplicate Connection Prevention" / "Multiple Tabs" requirements).
 */
const userSockets = new Map<string, Set<string>>()
// Tracks which room each socket is currently viewing, for presence + typing cleanup.
const socketRooms = new Map<string, Set<string>>()

export function registerSocket(userId: string, socketId: string): boolean {
	const set = userSockets.get(userId) ?? new Set<string>()
	const wasOffline = set.size === 0
	set.add(socketId)
	userSockets.set(userId, set)
	return wasOffline
}

/** Returns true if the user has just gone fully offline (no sockets left). */
export function unregisterSocket(userId: string, socketId: string): boolean {
	const set = userSockets.get(userId)
	if (!set) return true
	set.delete(socketId)
	if (set.size === 0) {
		userSockets.delete(userId)
		socketRooms.delete(socketId)
		return true
	}
	userSockets.set(userId, set)
	socketRooms.delete(socketId)
	return false
}

export function isUserOnline(userId: string): boolean {
	return (userSockets.get(userId)?.size ?? 0) > 0
}

export function onlineUserIds(): string[] {
	return Array.from(userSockets.keys())
}

export function trackRoomJoin(socketId: string, roomId: string) {
	const set = socketRooms.get(socketId) ?? new Set<string>()
	set.add(roomId)
	socketRooms.set(socketId, set)
}

export function trackRoomLeave(socketId: string, roomId: string) {
	socketRooms.get(socketId)?.delete(roomId)
}

export async function setUserOnline(userId: string) {
	try {
		await prisma.user.update({ where: { id: userId }, data: { status: "ONLINE", lastSeen: new Date() } })
	} catch (err) {
		socketLogger.error("Failed to set user online", { userId, err })
	}
}

export async function setUserOffline(userId: string) {
	try {
		await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE", lastSeen: new Date() } })
	} catch (err) {
		socketLogger.error("Failed to set user offline", { userId, err })
	}
}

export function getOnlineUsersForRoom(roomId: string): string[] {
	const online = new Set<string>()
	for (const [socketId, rooms] of socketRooms) {
		if (rooms.has(roomId)) {
			for (const [uid, sockets] of userSockets) {
				if (sockets.has(socketId)) {
					online.add(uid)
				}
			}
		}
	}
	return Array.from(online)
}
