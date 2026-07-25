import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(4000),
	SERVER_URL: z.string().url().default("http://localhost:4000"),
	CLIENT_URL: z.string().url().default("http://localhost:3000"),

	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

	JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
	JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
	JWT_ACCESS_EXPIRES: z.string().default("15m"),
	JWT_REFRESH_EXPIRES: z.string().default("7d"),

	COOKIE_DOMAIN: z.string().optional(),

	BREVO_API_KEY: z.string().optional().default(""),
	EMAIL_FROM: z.string().optional().default("Ripple Chat <no-reply@ripple.chat>"),

	CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
	CLOUDINARY_API_KEY: z.string().optional().default(""),
	CLOUDINARY_API_SECRET: z.string().optional().default(""),

	RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
	RATE_LIMIT_MAX: z.coerce.number().default(300),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
	// eslint-disable-next-line no-console
	console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors)
	throw new Error("Invalid environment variables. Check .env against .env.example")
}

export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
