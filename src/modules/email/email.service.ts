import https from "https"
import { env, isProd } from "../../config/env"
import { logger } from "../../config/logger"
import { otpEmailTemplate, resetPasswordEmailTemplate, welcomeEmailTemplate } from "./email.templates"

let brevoHealthy = false

interface BrevoEmail {
	to: { email: string; name?: string }[]
	sender: { name?: string; email: string }
	subject: string
	htmlContent: string
}

function callBrevoAPI(payload: BrevoEmail): Promise<void> {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify(payload)
		const req = https.request(
			"https://api.brevo.com/v3/smtp/email",
			{
				method: "POST",
				headers: {
					"api-key": env.BREVO_API_KEY,
					"content-type": "application/json",
					accept: "application/json",
				},
			},
			(res) => {
				let data = ""
				res.on("data", (chunk) => (data += chunk))
				res.on("end", () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve()
					} else {
						let detail = ""
						try {
							const parsed = JSON.parse(data)
							detail = parsed.message || data
						} catch {
							detail = data
						}
						reject(new Error(`Brevo API ${res.statusCode}: ${detail}`))
					}
				})
			},
		)
		req.on("error", reject)
		req.setTimeout(15_000, () => {
			req.destroy()
			reject(new Error("Brevo API request timed out"))
		})
		req.write(body)
		req.end()
	})
}

function parseFrom(from: string): { name: string; email: string } {
	const match = from.match(/^(.+)<(.+)>$/)
	if (match) return { name: match[1].trim(), email: match[2].trim() }
	return { name: "", email: from.trim() }
}

export async function verifySmtpConnection(): Promise<boolean> {
	if (!env.BREVO_API_KEY) {
		logger.warn("Brevo API key not configured — emails will be skipped")
		return false
	}
	brevoHealthy = true
	logger.info("Brevo API ready")
	return true
}

async function send(to: string, subject: string, html: string) {
	if (!env.BREVO_API_KEY) {
		logger.warn(`Brevo not configured; skipping email send to ${to} ("${subject}")`)
		if (!isProd) logger.debug(html)
		return
	}

	if (!brevoHealthy) {
		logger.warn(`Email service unhealthy; skipping email send to ${to} ("${subject}")`)
		return
	}

	const sender = parseFrom(env.EMAIL_FROM)
	await callBrevoAPI({
		sender,
		to: [{ email: to }],
		subject,
		htmlContent: html,
	})
	logger.info("Email sent via Brevo", { to, subject })
}

export async function sendOtpEmail(to: string, name: string, code: string) {
	await send(to, "Your Ripple Chat verification code", otpEmailTemplate(name, code))
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
	await send(to, "Reset your Ripple Chat password", resetPasswordEmailTemplate(name, resetUrl))
}

export async function sendWelcomeEmail(to: string, name: string) {
	await send(to, "Welcome to Ripple Chat", welcomeEmailTemplate(name))
}
