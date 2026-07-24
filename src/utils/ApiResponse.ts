export class ApiResponse<T = unknown> {
	public success: boolean
	public message: string
	public data: T | null
	public errors: unknown | null

	constructor(success: boolean, message: string, data: T | null = null, errors: unknown | null = null) {
		this.success = success
		this.message = message
		this.data = data
		this.errors = errors
	}

	static ok<T>(message: string, data: T | null = null) {
		return new ApiResponse<T>(true, message, data, null)
	}

	static fail(message: string, errors: unknown = null) {
		return new ApiResponse(false, message, null, errors)
	}
}
