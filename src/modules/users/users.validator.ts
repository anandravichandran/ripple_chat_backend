import { z } from "zod"

export const updateProfileSchema = z.object({
	name: z.string().trim().min(2).max(60).optional(),
	bio: z.string().trim().max(280).optional().nullable(),
	phone: z.string().trim().max(20).optional().nullable(),
	socials: z
		.object({
			twitter: z.string().url().optional().nullable(),
			github: z.string().url().optional().nullable(),
			linkedin: z.string().url().optional().nullable(),
			website: z.string().url().optional().nullable(),
		})
		.partial()
		.optional(),
	status: z.enum(["ONLINE", "IDLE", "DND", "OFFLINE"]).optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const userSearchQuerySchema = z.object({
	q: z.string().trim().min(1).max(60).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
})
