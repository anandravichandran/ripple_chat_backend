import { z } from "zod"

export const uuidParamSchema = z.object({ id: z.string().uuid("Invalid id") })

export const createRoomSchema = z.object({
	name: z.string().trim().min(2, "Room name must be at least 2 characters").max(60),
	description: z.string().trim().max(280).optional(),
	icon: z.string().trim().max(8).optional(),
	category: z.string().trim().max(30).optional(),
	visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
	password: z.string().min(4).max(64).optional(),
})
export type CreateRoomInput = z.infer<typeof createRoomSchema>

export const updateRoomSchema = z.object({
	name: z.string().trim().min(2).max(60).optional(),
	description: z.string().trim().max(280).optional().nullable(),
	icon: z.string().trim().max(8).optional().nullable(),
	category: z.string().trim().max(30).optional(),
	visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
	password: z.string().min(4).max(64).optional().nullable(),
})
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>

export const listRoomsQuerySchema = z.object({
	q: z.string().trim().max(60).optional(),
	category: z.string().trim().max(30).optional(),
	visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
	pinned: z.enum(["true", "false"]).optional(),
	recentlyJoined: z.enum(["true", "false"]).optional(),
	isDirect: z.enum(["true", "false"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const joinRoomSchema = z.object({
	password: z.string().optional(),
	inviteCode: z.string().optional(),
})
