export type DeviceContext = {
	userAgent?: string | null
	ip?: string | null
}

export type PublicUser = {
	id: string
	name: string
	username: string
	email: string
	avatarUrl: string | null
	bio: string | null
	role: string
	status: string
	isVerified: boolean
	lastSeen: Date
	createdAt: Date
}
