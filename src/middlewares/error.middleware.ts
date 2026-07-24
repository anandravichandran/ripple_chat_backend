import type { NextFunction, Request, Response } from "express"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"
import jwt from "jsonwebtoken"
import multer from "multer"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { logger } from "../config/logger"
import { isProd } from "../config/env"

export function notFoundHandler(req: Request, res: Response) {
	res
		.status(404)
		.json(ApiResponse.fail(`Route not found: ${req.method} ${req.originalUrl}`))
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): ApiError {
	switch (err.code) {
		case "P2002":
			return ApiError.conflict(`Duplicate value for ${(err.meta?.target as string[])?.join(", ") ?? "field"}`)
		case "P2025":
			return ApiError.notFound("Requested record does not exist")
		case "P2003":
			return ApiError.badRequest("Related record does not exist")
		default:
			return ApiError.internal("Database error")
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
	let apiError: ApiError

	if (err instanceof ApiError) {
		apiError = err
	} else if (err instanceof ZodError) {
		apiError = ApiError.badRequest("Validation failed", err.flatten().fieldErrors)
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		apiError = mapPrismaError(err)
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		apiError = ApiError.badRequest("Invalid database query")
	} else if (err instanceof multer.MulterError) {
		apiError = ApiError.badRequest(`Upload error: ${err.message}`)
	} else if (err instanceof jwt.TokenExpiredError) {
		apiError = ApiError.unauthorized("Token has expired")
	} else if (err instanceof jwt.JsonWebTokenError) {
		apiError = ApiError.unauthorized("Invalid token")
	} else {
		apiError = ApiError.internal(isProd ? "Internal server error" : (err as Error)?.message ?? "Unknown error")
	}

	if (apiError.statusCode >= 500) {
		logger.error(apiError.message, { stack: (err as Error)?.stack, path: req.originalUrl })
	} else {
		logger.warn(apiError.message, { path: req.originalUrl, statusCode: apiError.statusCode })
	}

	res.status(apiError.statusCode).json(ApiResponse.fail(apiError.message, apiError.errors))
}
