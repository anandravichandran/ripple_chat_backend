import winston from "winston"
import path from "path"
import { env, isProd } from "./env"

const { combine, timestamp, printf, colorize, json } = winston.format

const consoleFormat = combine(
	colorize(),
	timestamp({ format: "HH:mm:ss" }),
	printf(({ level, message, timestamp: ts, ...meta }) => {
		const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
		return `[${ts}] ${level}: ${message}${metaStr}`
	}),
)

export const logger = winston.createLogger({
	level: isProd ? "info" : "debug",
	format: combine(timestamp(), json()),
	transports: [
		new winston.transports.Console({ format: consoleFormat }),
		new winston.transports.File({
			filename: path.join(process.cwd(), "logs", "error.log"),
			level: "error",
		}),
		new winston.transports.File({
			filename: path.join(process.cwd(), "logs", "combined.log"),
		}),
	],
	exitOnError: false,
})

export const authLogger = logger.child({ scope: "auth" })
export const socketLogger = logger.child({ scope: "socket" })
export const httpLogger = logger.child({ scope: "http" })

export const morganStream = {
	write: (message: string) => httpLogger.info(message.trim()),
}

void env
