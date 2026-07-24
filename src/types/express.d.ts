import type { UserRole } from "@prisma/client"

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string
				role: UserRole
				username: string
			}
			requestId?: string
		}
	}
}

export {}
