import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Hash password for all users
  const passwordHash = await bcrypt.hash("password", 12)

  // Create admin user
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

  // Create staff users
  const johnDoe = await prisma.user.upsert({
    where: { username: "john_doe" },
    update: {},
    create: {
      username: "john_doe",
      email: "john.doe@example.com",
      password: passwordHash,
      firstName: "John",
      lastName: "Doe",
      phone: "+1-555-0002",
      role: "STAFF",
      status: "ENABLED",
    },
  })

  const janeSmith = await prisma.user.upsert({
    where: { username: "jane_smith" },
    update: {},
    create: {
      username: "jane_smith",
      email: "jane.smith@example.com",
      password: passwordHash,
      firstName: "Jane",
      lastName: "Smith",
      phone: "+1-555-0003",
      role: "STAFF",
      status: "ENABLED",
    },
  })

  // Create sample products
  const product1 = await prisma.product.upsert({
    where: { shopifyId: "shopify-1" },
    update: {},
    create: {
      shopifyId: "shopify-1",
      name: "Wireless Headphones",
      nameEn: "Wireless Headphones",
      nameFr: "Écouteurs Sans Fil",
      price: 99.99,
      imageUrl: "/placeholder.jpg",
      isActive: true,
    },
  })

  const product2 = await prisma.product.upsert({
    where: { shopifyId: "shopify-2" },
    update: {},
    create: {
      shopifyId: "shopify-2",
      name: "Smartphone Case",
      nameEn: "Smartphone Case",
      nameFr: "Étui pour Smartphone",
      price: 24.99,
      imageUrl: "/placeholder.jpg",
      isActive: true,
    },
  })

  const product3 = await prisma.product.upsert({
    where: { shopifyId: "shopify-3" },
    update: {},
    create: {
      shopifyId: "shopify-3",
      name: "Bluetooth Speaker",
      nameEn: "Bluetooth Speaker",
      nameFr: "Haut-parleur Bluetooth",
      price: 79.99,
      imageUrl: "/placeholder.jpg",
      isActive: true,
    },
  })

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      customerName: "Alice Johnson",
      customerPhone: "+1-555-1001",
      customerEmail: "alice@example.com",
      customerAddress: "123 Main St",
      customerCity: "Anytown, ST 12345",
      status: "DELIVERED",
      total: 99.99,
      notes: "Customer requested expedited shipping",
      assignedToId: johnDoe.id,
      items: {
        create: [
          {
            quantity: 1,
            price: 99.99,
            productId: product1.id,
          },
        ],
      },
    },
  })

  const order2 = await prisma.order.create({
    data: {
      customerName: "Bob Wilson",
      customerPhone: "+1-555-1002",
      customerEmail: "bob@example.com",
      customerAddress: "456 Oak Ave",
      customerCity: "Another City, ST 67890",
      status: "PENDING",
      total: 49.98,
      assignedToId: janeSmith.id,
      items: {
        create: [
          {
            quantity: 2,
            price: 24.99,
            productId: product2.id,
          },
        ],
      },
    },
  })

  const order3 = await prisma.order.create({
    data: {
      customerName: "Carol Davis",
      customerPhone: "+1-555-1003",
      customerEmail: "carol@example.com",
      customerAddress: "789 Pine Rd",
      customerCity: "Third Town, ST 13579",
      status: "PENDING",
      total: 79.99,
      notes: "Gift wrapping requested",
      assignedToId: admin.id,
      items: {
        create: [
          {
            quantity: 1,
            price: 79.99,
            productId: product3.id,
          },
        ],
      },
    },
  })

  // Create sample activities
  await prisma.userActivity.createMany({
    data: [
      {
        userId: admin.id,
        action: "LOGIN",
        details: "Admin logged in",
      },
      {
        userId: johnDoe.id,
        action: "ORDER_CREATED",
        details: "Created order for Alice Johnson",
      },
      {
        userId: janeSmith.id,
        action: "ORDER_UPDATED",
        details: "Updated order status to PROCESSING",
      },
    ],
  })

  console.log("✅ Database seeded successfully!")
  console.log("👤 Users created:", { admin: admin.username, johnDoe: johnDoe.username, janeSmith: janeSmith.username })
  console.log("📦 Orders created:", { order1: order1.id, order2: order2.id, order3: order3.id })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
