import multer from "multer"
import { ApiError } from "../utils/ApiError"

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"])
const ALLOWED_FILE_TYPES = new Set([
	...ALLOWED_IMAGE_TYPES,
	"application/pdf",
	"text/plain",
	"application/zip",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const storage = multer.memoryStorage()

export const uploadAvatar = multer({
	storage,
	limits: { fileSize: MAX_IMAGE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
			return cb(ApiError.badRequest("Only PNG, JPG, WEBP or GIF images are allowed") as unknown as Error)
		}
		cb(null, true)
	},
}).single("avatar")

export const uploadAttachment = multer({
	storage,
	limits: { fileSize: MAX_FILE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
			return cb(ApiError.badRequest("Unsupported file type") as unknown as Error)
		}
		cb(null, true)
	},
}).single("file")

export { ALLOWED_IMAGE_TYPES, ALLOWED_FILE_TYPES, MAX_IMAGE_SIZE, MAX_FILE_SIZE }
