import type { NextFunction, Request, Response } from "express"
import { ZodError, type ZodSchema } from "zod"
import { validationResult } from "express-validator"
import { ApiError } from "../utils/ApiError"

type ZodRequestSchema = {
	body?: ZodSchema
	query?: ZodSchema
	params?: ZodSchema
}

/**
 * Validates req.body/query/params against Zod schemas and replaces them with
 * the parsed (and coerced/defaulted) values.
 */
export function validate(schemas: ZodRequestSchema) {
	return (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (schemas.body) req.body = schemas.body.parse(req.body)
			if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query
			if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
			next()
		} catch (err) {
			if (err instanceof ZodError) {
				return next(ApiError.badRequest("Validation failed", err.flatten().fieldErrors))
			}
			next(err)
		}
	}
}

/** Runs after express-validator chains and rejects on the first failing rule. */
export function checkValidation(req: Request, _res: Response, next: NextFunction) {
	const result = validationResult(req)
	if (!result.isEmpty()) {
		return next(ApiError.badRequest("Validation failed", result.array()))
	}
	next()
}
