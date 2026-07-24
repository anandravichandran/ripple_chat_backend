import crypto from "crypto"
import bcrypt from "bcrypt"

const OTP_LENGTH = 6
const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

export function generateOtpCode(): string {
	const n = crypto.randomInt(0, 10 ** OTP_LENGTH)
	return n.toString().padStart(OTP_LENGTH, "0")
}

export async function hashOtpCode(code: string): Promise<string> {
	return bcrypt.hash(code, 10)
}

export async function compareOtpCode(code: string, hash: string): Promise<boolean> {
	return bcrypt.compare(code, hash)
}

export function otpExpiryDate(): Date {
	return new Date(Date.now() + OTP_TTL_MS)
}

export { MAX_ATTEMPTS as OTP_MAX_ATTEMPTS }
