import nodemailer from "nodemailer"
import { env, isProd } from "../../config/env"
import { logger } from "../../config/logger"
import { otpEmailTemplate, resetPasswordEmailTemplate, welcomeEmailTemplate } from "./email.templates"

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST || undefined,
	port: env.SMTP_PORT,
	secure: env.SMTP_PORT === 465,
	auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
})

let smtpHealthy = false

export async function verifySmtpConnection(): Promise<boolean> {
	if (!env.SMTP_HOST) {
		logger.warn("SMTP not configured — emails will be skipped")
		return false
	}
	try {
		await Promise.race([
			transporter.verify(),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("SMTP verify timed out after 10s")), 10_000),
			),
		])
		smtpHealthy = true
		logger.info("SMTP connection verified")
		return true
	} catch (err) {
		logger.error("SMTP verification failed — check credentials or network", { err })
		smtpHealthy = false
		return false
	}
}

async function send(to: string, subject: string, html: string) {
	if (!env.SMTP_HOST) {
		logger.warn(`SMTP not configured; skipping email send to ${to} ("${subject}")`)
		if (!isProd) logger.debug(html)
		return
	}

	if (!smtpHealthy) {
		logger.warn(`SMTP unhealthy; skipping email send to ${to} ("${subject}")`)
		return
	}

	const info = await transporter.sendMail({
		from: env.EMAIL_FROM,
		to,
		subject,
		html,
	})
	logger.debug("Email sent", { messageId: info.messageId, to, subject })
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
