import { PrismaClient, RoomMemberRole, UserRole } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
	const password = await bcrypt.hash("Passw0rd!", 12)

	const alice = await prisma.user.upsert({
		where: { email: "alice@ripple.chat" },
		update: {},
		create: {
			name: "Alice Kim",
			username: "alicekim",
			email: "alice@ripple.chat",
			passwordHash: password,
			isVerified: true,
			role: UserRole.ADMIN,
			bio: "Building Ripple Chat ✨",
			avatarUrl: null,
		},
	})

	const bob = await prisma.user.upsert({
		where: { email: "bob@ripple.chat" },
		update: {},
		create: {
			name: "Bob Turner",
			username: "bobturner",
			email: "bob@ripple.chat",
			passwordHash: password,
			isVerified: true,
			role: UserRole.USER,
			bio: "Designer & coffee enthusiast",
		},
	})

	const room = await prisma.room.upsert({
		where: { id: "00000000-0000-0000-0000-000000000001" },
		update: {},
		create: {
			id: "00000000-0000-0000-0000-000000000001",
			name: "Design Crit",
			icon: "🎨",
			description: "Share and critique design work in progress.",
			category: "design",
			ownerId: alice.id,
		},
	})

	await prisma.roomMember.upsert({
		where: { roomId_userId: { roomId: room.id, userId: alice.id } },
		update: {},
		create: { roomId: room.id, userId: alice.id, role: RoomMemberRole.OWNER, recentlyJoined: false },
	})

	await prisma.roomMember.upsert({
		where: { roomId_userId: { roomId: room.id, userId: bob.id } },
		update: {},
		create: { roomId: room.id, userId: bob.id, role: RoomMemberRole.MEMBER },
	})

	await prisma.message.create({
		data: {
			roomId: room.id,
			authorId: alice.id,
			text: "Welcome to Design Crit 👋 drop your latest work here.",
		},
	})

	console.log("Seed complete:", { alice: alice.email, bob: bob.email, room: room.name })
}

main()
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
