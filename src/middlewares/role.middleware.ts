import type { NextFunction, Request, Response } from "express"
import type { UserRole } from "@prisma/client"
import { ApiError } from "../utils/ApiError"

/** Role-based access control. Use after `requireAuth`. */
export function requireRole(...roles: UserRole[]) {
	return (req: Request, _res: Response, next: NextFunction) => {
		if (!req.user) return next(ApiError.unauthorized())
		if (!roles.includes(req.user.role as UserRole)) {
			return next(ApiError.forbidden("You do not have permission to perform this action"))
		}
		next()
	}
}

export const requireAdmin = requireRole("ADMIN" as UserRole)
