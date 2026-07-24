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

async function send(to: string, subject: string, html: string) {
	if (!env.SMTP_HOST) {
		// No SMTP configured (e.g. local dev) — log instead of throwing so the
		// auth flow keeps working without real credentials.
		logger.warn(`SMTP not configured; skipping email send to ${to} ("${subject}")`)
		if (!isProd) logger.debug(html)
		return
	}

	await transporter.sendMail({
		from: env.EMAIL_FROM,
		to,
		subject,
		html,
	})
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
