export class ApiError extends Error {
	public statusCode: number
	public errors: unknown | null
	public isOperational: boolean

	constructor(statusCode: number, message: string, errors: unknown | null = null) {
		super(message)
		this.statusCode = statusCode
		this.errors = errors
		this.isOperational = true
		Object.setPrototypeOf(this, ApiError.prototype)
	}

	static badRequest(message = "Bad request", errors: unknown = null) {
		return new ApiError(400, message, errors)
	}
	static unauthorized(message = "Unauthorized", errors: unknown = null) {
		return new ApiError(401, message, errors)
	}
	static forbidden(message = "Forbidden", errors: unknown = null) {
		return new ApiError(403, message, errors)
	}
	static notFound(message = "Not found", errors: unknown = null) {
		return new ApiError(404, message, errors)
	}
	static conflict(message = "Conflict", errors: unknown = null) {
		return new ApiError(409, message, errors)
	}
	static tooMany(message = "Too many requests", errors: unknown = null) {
		return new ApiError(429, message, errors)
	}
	static internal(message = "Internal server error", errors: unknown = null) {
		return new ApiError(500, message, errors)
	}
}
