import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  try {
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

    console.log("👤 Users created successfully")

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

    console.log("📦 Products created successfully")

    // Create sample delivery agency
    const deliveryAgency = await prisma.deliveryAgency.upsert({
      where: { id: "best-delivery" },
      update: {},
      create: {
        id: "best-delivery",
        name: "Best Delivery",
        enabled: false,
        credentialsType: "username_password",
        settings: {
          autoSync: true,
          pollingInterval: 30,
          supportedRegions: [
            'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
            'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'La Manouba',
            'Le Kef', 'Mahdia', 'Médenine', 'Monastir', 'Nabeul', 'Sfax',
            'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur',
            'Tunis', 'Zaghouan'
          ]
        }
      },
    })

    console.log("🚚 Delivery agency created successfully")

    // Create sample orders
    const order1 = await prisma.order.create({
      data: {
        customerName: "Alice Johnson",
        customerPhone1: "+1-555-1001", // Updated to use customerPhone1
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
        customerPhone1: "+1-555-1002", // Updated to use customerPhone1
        customerPhone2: "+1-555-1012", // Added secondary phone
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
        customerPhone1: "+1-555-1003", // Updated to use customerPhone1
        customerEmail: "carol@example.com",
        customerAddress: "789 Pine Rd",
        customerCity: "Third Town, ST 13579",
        status: "PROCESSING",
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

    console.log("📋 Orders created successfully")

    // Create order status history
    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order1.id,
          status: "PENDING",
          notes: "Order created",
          userId: johnDoe.id,
        },
        {
          orderId: order1.id,
          status: "DELIVERED",
          notes: "Order delivered successfully",
          userId: johnDoe.id,
        },
        {
          orderId: order2.id,
          status: "PENDING",
          notes: "Order created",
          userId: janeSmith.id,
        },
        {
          orderId: order3.id,
          status: "PENDING",
          notes: "Order created",
          userId: admin.id,
        },
        {
          orderId: order3.id,
          status: "PROCESSING",
          notes: "Order moved to processing",
          userId: admin.id,
        },
      ],
    })

    console.log("📊 Order status history created successfully")

    // Create sample activities (fixed model name)
    await prisma.activity.createMany({
      data: [
        {
          type: "LOGIN",
          description: "Admin logged in",
          userId: admin.id,
          metadata: {
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        },
        {
          type: "ORDER_CREATED",
          description: "Created order for Alice Johnson",
          userId: johnDoe.id,
          metadata: {
            orderId: order1.id,
            customerName: "Alice Johnson"
          }
        },
        {
          type: "ORDER_UPDATED",
          description: "Updated order status to PROCESSING",
          userId: janeSmith.id,
          metadata: {
            orderId: order3.id,
            oldStatus: "PENDING",
            newStatus: "PROCESSING"
          }
        },
        {
          type: "PRODUCT_CREATED",
          description: "Created new product",
          userId: admin.id,
          metadata: {
            productId: product1.id,
            productName: "Wireless Headphones"
          }
        }
      ],
    })

    console.log("📋 Activities created successfully")

    console.log("✅ Database seeded successfully!")
    console.log("👤 Users created:", { 
      admin: admin.username, 
      johnDoe: johnDoe.username, 
      janeSmith: janeSmith.username 
    })
    console.log("📦 Orders created:", { 
      order1: order1.id, 
      order2: order2.id, 
      order3: order3.id 
    })
    console.log("🏭 Products created:", {
      product1: product1.id,
      product2: product2.id, 
      product3: product3.id
    })
    console.log("🚚 Delivery agency:", deliveryAgency.id)

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