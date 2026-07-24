import { cloudinary } from "../../config/cloudinary"
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

function bufferToDataUri(buffer: Buffer, mimetype: string) {
	return `data:${mimetype};base64,${buffer.toString("base64")}`
}

export async function uploadImageBuffer(
	buffer: Buffer,
	mimetype: string,
	folder: string,
): Promise<CloudinaryUploadResult> {
	try {
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
	} catch (err) {
		throw ApiError.internal("Failed to upload image to storage", err)
	}
}

export async function uploadFileBuffer(
	buffer: Buffer,
	mimetype: string,
	folder: string,
	fileName: string,
): Promise<CloudinaryUploadResult> {
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
		throw ApiError.internal("Failed to upload file to storage", err)
	}
}

export async function deleteAsset(publicId: string, resourceType: "image" | "raw" | "video" = "image") {
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
	} catch {
		// non-fatal: asset cleanup failures shouldn't break the request flow
	}
}
