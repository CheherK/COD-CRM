import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  try {
    // Hash the password "ch-admin"
    const passwordHash = await bcrypt.hash("ch-admin", 12)

    // Create or update the admin user
    const admin = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        email: "admin@example.com",
        password: passwordHash,
        firstName: "System",
        lastName: "Administrator",
        phone: "+1-555-0001",
        role: "ADMIN",
        status: "ENABLED",
      },
    })

    console.log("✅ Admin user created successfully:", admin.username)
  } catch (error) {
    console.error("❌ Seed failed:", error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log("🔌 Database connection closed")
  })
  .catch(async (e) => {
    console.error("💥 Critical seed failure:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
