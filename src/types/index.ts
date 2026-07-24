export type PaginatedResult<T> = {
	items: T[]
	meta: {
		total: number
		page: number
		limit: number
		totalPages: number
		hasNextPage: boolean
	}
}

export type AuthenticatedUser = {
	id: string
	role: "USER" | "MODERATOR" | "ADMIN"
	username: string
}
