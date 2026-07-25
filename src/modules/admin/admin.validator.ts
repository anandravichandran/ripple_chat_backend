import { z } from "zod"

export const listUsersQuerySchema = z.object({
	q: z.string().trim().max(60).optional(),
	role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
	status: z.enum(["ONLINE", "IDLE", "DND", "OFFLINE"]).optional(),
	isVerified: z.enum(["true", "false"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	sortBy: z.enum(["name", "username", "email", "role", "status", "createdAt", "lastSeen"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
})

export const updateUserRoleSchema = z.object({
	role: z.enum(["USER", "MODERATOR", "ADMIN"]),
})

export const deleteUserSchema = z.object({
	hardDelete: z.boolean().optional(),
})

export const analyticsQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(365).optional(),
})
