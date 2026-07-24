import { z } from "zod"

export const uuidParamSchema = z.object({ id: z.string().uuid("Invalid id") })

export const listMessagesQuerySchema = z.object({
	cursor: z.string().uuid().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	q: z.string().trim().max(120).optional(),
})

export const createMessageSchema = z.object({
	text: z.string().trim().min(1, "Message cannot be empty").max(4000).optional(),
	type: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
	replyToId: z.string().uuid().optional(),
	mentions: z.array(z.string().uuid()).max(50).optional(),
	attachment: z
		.object({
			url: z.string().url(),
			publicId: z.string(),
			fileName: z.string(),
			fileType: z.string(),
			fileSize: z.number().int().positive(),
			width: z.number().int().positive().optional(),
			height: z.number().int().positive().optional(),
		})
		.optional(),
})
export type CreateMessageInput = z.infer<typeof createMessageSchema>

export const updateMessageSchema = z.object({
	text: z.string().trim().min(1, "Message cannot be empty").max(4000).optional(),
	pinned: z.boolean().optional(),
})
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>

export const reactSchema = z.object({
	emoji: z.string().trim().min(1).max(8),
})
