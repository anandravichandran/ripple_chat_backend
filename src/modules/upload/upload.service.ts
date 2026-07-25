import path from "path"
import fs from "fs/promises"
import { v4 as uuid } from "uuid"
import { cloudinary } from "../../config/cloudinary"
import { env } from "../../config/env"
import { ApiError } from "../../utils/ApiError"

export type CloudinaryUploadResult = {
	url: string
	publicId: string
	width?: number
	height?: number
	bytes: number
	format: string
	resourceType: string
}

const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads")

function ensureUploadsDir(folder: string) {
	return fs.mkdir(path.join(UPLOADS_DIR, folder), { recursive: true })
}

function bufferToDataUri(buffer: Buffer, mimetype: string) {
	return `data:${mimetype};base64,${buffer.toString("base64")}`
}

const isCloudinaryConfigured = () =>
	Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)

async function uploadToCloudinary(buffer: Buffer, mimetype: string, folder: string): Promise<CloudinaryUploadResult> {
	const result = await cloudinary.uploader.upload(bufferToDataUri(buffer, mimetype), {
		folder: `ripple-chat/${folder}`,
		resource_type: "image",
		transformation: [{ width: 1024, height: 1024, crop: "limit", quality: "auto" }],
	})
	return {
		url: result.secure_url,
		publicId: result.public_id,
		width: result.width,
		height: result.height,
		bytes: result.bytes,
		format: result.format,
		resourceType: result.resource_type,
	}
}

async function uploadToLocal(buffer: Buffer, mimetype: string, folder: string): Promise<CloudinaryUploadResult> {
	await ensureUploadsDir(folder)
	const ext = mimetype.split("/")[1] || "png"
	const fileName = `${uuid()}.${ext}`
	const filePath = path.join(UPLOADS_DIR, folder, fileName)
	await fs.writeFile(filePath, buffer)
	return {
		url: `/uploads/${folder}/${fileName}`,
		publicId: `local_${folder}_${fileName}`,
		width: undefined,
		height: undefined,
		bytes: buffer.length,
		format: ext,
		resourceType: "image",
	}
}

export async function uploadImageBuffer(
	buffer: Buffer,
	mimetype: string,
	folder: string,
): Promise<CloudinaryUploadResult> {
	if (isCloudinaryConfigured()) {
		try {
			return await uploadToCloudinary(buffer, mimetype, folder)
		} catch (err) {
			console.warn("Cloudinary upload failed, falling back to local storage:", err)
		}
	}
	return uploadToLocal(buffer, mimetype, folder)
}

export async function uploadFileBuffer(
	buffer: Buffer,
	mimetype: string,
	folder: string,
	fileName: string,
): Promise<CloudinaryUploadResult> {
	if (isCloudinaryConfigured()) {
		try {
			const result = await cloudinary.uploader.upload(bufferToDataUri(buffer, mimetype), {
				folder: `ripple-chat/${folder}`,
				resource_type: "auto",
				use_filename: true,
				filename_override: fileName,
			})
			return {
				url: result.secure_url,
				publicId: result.public_id,
				width: result.width,
				height: result.height,
				bytes: result.bytes,
				format: result.format,
				resourceType: result.resource_type,
			}
		} catch (err) {
			console.warn("Cloudinary upload failed, falling back to local storage:", err)
		}
	}
	return uploadToLocal(buffer, mimetype, folder)
}

export async function deleteAsset(publicId: string, resourceType: "image" | "raw" | "video" = "image") {
	if (publicId.startsWith("local_")) {
		const parts = publicId.split("_")
		const folder = parts[1]
		const fileName = parts.slice(2).join("_")
		const filePath = path.join(UPLOADS_DIR, folder, fileName)
		try { await fs.unlink(filePath) } catch { /* non-fatal */ }
		return
	}
	if (isCloudinaryConfigured()) {
		try {
			await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
		} catch {
			// non-fatal: asset cleanup failures shouldn't break the request flow
		}
	}
}
