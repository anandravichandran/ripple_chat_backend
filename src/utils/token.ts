import crypto from "crypto"

/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 * The raw token is sent to the client (email link / cookie); only the hash
 * is persisted, mirroring the OTP/refresh-token hashing strategy.
 */
export function generateSecureToken(bytes = 32): { raw: string; hash: string } {
	const raw = crypto.randomBytes(bytes).toString("hex")
	return { raw, hash: hashToken(raw) }
}

export function hashToken(raw: string): string {
	return crypto.createHash("sha256").update(raw).digest("hex")
}

export function generateInviteCode(): string {
	return crypto.randomBytes(6).toString("base64url")
}
