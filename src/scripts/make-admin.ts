/**
 * Script to promote a user to ADMIN role.
 * Usage: tsx src/scripts/make-admin.ts <username-or-email>
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	const identifier = process.argv[2]
	if (!identifier) {
		console.error('Usage: tsx src/scripts/make-admin.ts <username-or-email>')
		process.exit(1)
	}

	const user = await prisma.user.findFirst({
		where: {
			OR: [{ email: identifier }, { username: identifier }],
		},
	})

	if (!user) {
		console.error(`User not found: ${identifier}`)
		process.exit(1)
	}

	const updated = await prisma.user.update({
		where: { id: user.id },
		data: { role: 'ADMIN', isVerified: true },
		select: { id: true, name: true, username: true, email: true, role: true, isVerified: true },
	})

	console.log('✅ User promoted to ADMIN:')
	console.log(updated)
	await prisma.$disconnect()
}

main().catch((err) => {
	console.error(err)
	prisma.$disconnect()
	process.exit(1)
})
