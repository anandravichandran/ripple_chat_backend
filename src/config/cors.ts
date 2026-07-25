import type { CorsOptions } from "cors"
import { env, isProd } from "./env"

const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean)

function isOriginAllowed(origin: string): boolean {
	if (allowedOrigins.some((a) => a === origin)) return true
	if (!isProd) return true
	if (origin.endsWith(".vercel.app")) return true
	return false
}

export const corsOptions: CorsOptions = {
	origin: (origin, callback) => {
		if (!origin || isOriginAllowed(origin)) {
			callback(null, true)
			return
		}
		callback(null, false)
	},
	credentials: true,
	methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
}
