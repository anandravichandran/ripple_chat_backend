import { z } from "zod"

export const uuidParamSchema = z.object({ id: z.string().uuid("Invalid id") })

export const listNotificationsQuerySchema = z.object({
	filter: z.enum(["all", "mentions", "messages", "invites"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
})
