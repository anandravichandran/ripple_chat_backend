export type PaginationQuery = {
	page?: string | number
	limit?: string | number
}

export function parsePagination(query: PaginationQuery, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
	const page = Math.max(1, Number(query.page) || defaults.page)
	const limit = Math.min(defaults.maxLimit, Math.max(1, Number(query.limit) || defaults.limit))
	const skip = (page - 1) * limit
	return { page, limit, skip }
}

export function buildMeta(total: number, page: number, limit: number) {
	return {
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit)),
		hasNextPage: page * limit < total,
	}
}
