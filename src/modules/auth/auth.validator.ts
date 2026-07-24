import { z } from "zod"

export const registerSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
	username: z
		.string()
		.trim()
		.toLowerCase()
		.min(3, "Username must be at least 3 characters")
		.max(24)
		.regex(/^[a-z0-9_.]+$/, "Username may only contain lowercase letters, numbers, dots and underscores"),
	email: z.string().trim().toLowerCase().email("Enter a valid email address"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain an uppercase letter")
		.regex(/[a-z]/, "Password must contain a lowercase letter")
		.regex(/[0-9]/, "Password must contain a number"),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const verifyEmailSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	code: z.string().length(6, "OTP code must be 6 digits").regex(/^\d+$/, "OTP code must be numeric"),
})
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const resendOtpSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
})

export const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email("Enter a valid email address"),
	password: z.string().min(1, "Password is required"),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
	token: z.string().min(10, "Reset token is required"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain an uppercase letter")
		.regex(/[a-z]/, "Password must contain a lowercase letter")
		.regex(/[0-9]/, "Password must contain a number"),
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
