const wrapper = (title: string, bodyHtml: string) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
	<div style="max-width:480px;margin:40px auto;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:40px;color:#FFFFFF;">
		<div style="font-size:20px;font-weight:700;margin-bottom:24px;color:#D9FF66;">Ripple Chat</div>
		<div style="font-size:16px;font-weight:600;margin-bottom:12px;">${title}</div>
		${bodyHtml}
		<div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#7A7A7A;">
			Secure. Instant. Connected. &mdash; Ripple Chat
		</div>
	</div>
</body>
</html>`

export function otpEmailTemplate(name: string, code: string) {
	return wrapper(
		"Verify your email",
		`<p style="color:#B4B4B4;font-size:14px;line-height:1.6;">Hi ${name}, use the code below to verify your Ripple Chat account. This code expires in 10 minutes.</p>
		<div style="margin:24px 0;padding:16px;background:rgba(217,255,102,0.08);border:1px solid rgba(217,255,102,0.3);border-radius:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#D9FF66;">${code}</div>
		<p style="color:#7A7A7A;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>`,
	)
}

export function resetPasswordEmailTemplate(name: string, resetUrl: string) {
	return wrapper(
		"Reset your password",
		`<p style="color:#B4B4B4;font-size:14px;line-height:1.6;">Hi ${name}, we received a request to reset your password. This link expires in 30 minutes.</p>
		<a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:linear-gradient(90deg,#D9FF66,#C5F56A);color:#0A0A0A;font-weight:600;border-radius:12px;text-decoration:none;">Reset password</a>
		<p style="color:#7A7A7A;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>`,
	)
}

export function welcomeEmailTemplate(name: string) {
	return wrapper(
		"Welcome to Ripple Chat 🎉",
		`<p style="color:#B4B4B4;font-size:14px;line-height:1.6;">Hi ${name}, your email is verified and your account is ready. Jump into a room and start chatting in real time.</p>`,
	)
}
