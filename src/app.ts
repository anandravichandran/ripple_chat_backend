import express, { type Express } from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import compression from "compression"
import morgan from "morgan"
import { corsOptions } from "./config/cors"
import { morganStream } from "./config/logger"
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware"
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware"
import { apiRouter } from "./routes"

export function createApp(): Express {
	const app = express()

	app.disable("x-powered-by")
	app.set("trust proxy", 1)

	app.use(helmet())
	app.use(cors(corsOptions))
	app.use(compression())
	app.use(cookieParser())
	app.use(express.json({ limit: "2mb" }))
	app.use(express.urlencoded({ extended: true, limit: "2mb" }))
	app.use(
		morgan("combined", {
			stream: morganStream,
			skip: (req) => req.originalUrl === "/health" || req.originalUrl === "/api/health",
		}),
	)
	app.use(globalRateLimiter)

	app.use("/api", apiRouter)
	// Mirror routes at root as well, matching the literal spec (e.g. /auth/login).
	app.use("/", apiRouter)

	app.use(notFoundHandler)
	app.use(errorHandler)

	return app
}
