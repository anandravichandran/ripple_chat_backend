import type { CorsOptions } from "cors"
import { env } from "./env"

const allowedOrigins = env.CLIENT_URL.split(",").map((origin) => origin.trim())

export const corsOptions: CorsOptions = {
	origin: (origin, callback) => {
		// Allow non-browser tools (curl/postman) with no origin header.
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true)
			return
		}
		callback(new Error("Not allowed by CORS"))
	},
	credentials: true,
	methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
}
