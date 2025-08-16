import bcrypt from "bcryptjs"

// Mock database interfaces
export interface User {
  id: string
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role: "ADMIN" | "STAFF"
  status: "ENABLED" | "DISABLED"
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  totalAmount: number
  shippingAddress: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface OrderItem {
  id: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface Activity {
  id: string
  type: string
  description: string
  userId?: string
  user?: User
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  createdAt: Date
}

export interface DeliveryAgency {
  id: string
  name: string
  enabled: boolean
  credentialsType: "username_password" | "email_password" | "api_key"
  credentialsUsername?: string
  credentialsEmail?: string
  credentialsPassword?: string
  credentialsApiKey?: string
  settings: Record<string, any>
  webhookUrl?: string
  pollingInterval: number
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryShipment {
  id: string
  orderId: string
  agencyId: string
  trackingNumber: string
  barcode?: string
  status: string
  lastStatusUpdate: Date
  printUrl?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryStatusLog {
  id: string
  shipmentId: string
  status: string
  statusCode?: number
  message: string
  timestamp: Date
  source: "api" | "webhook" | "manual"
  rawData?: Record<string, any>
  createdAt: Date
}

// Mock database class
class MockPrisma {
  private static instance: MockPrisma
  private users: User[] = []
  private orders: Order[] = []
  private activities: Activity[] = []
  private deliveryAgencies: DeliveryAgency[] = []
  private deliveryShipments: DeliveryShipment[] = []
  private deliveryStatusLogs: DeliveryStatusLog[] = []
  private initialized = false

  private constructor() {
    this.initializeData()
  }

  public static getInstance(): MockPrisma {
    if (!MockPrisma.instance) {
      MockPrisma.instance = new MockPrisma()
    }
    return MockPrisma.instance
  }

  private async initializeData() {
    if (this.initialized) return

    console.log("🔄 Initializing mock database...")

    // Create password hash for "password"
    const passwordHash = await bcrypt.hash("password", 10)
    console.log("🔐 Generated password hash:", passwordHash)

    // Initialize users
    this.users = [
      {
        id: "admin-1",
        username: "admin",
        email: "admin@example.com",
        password: passwordHash,
        firstName: "System",
        lastName: "Administrator",
        phone: "+1-555-0001",
        role: "ADMIN",
        status: "ENABLED",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date(),
      },
      {
        id: "staff-1",
        username: "john_doe",
        email: "john.doe@example.com",
        password: passwordHash,
        firstName: "John",
        lastName: "Doe",
        phone: "+1-555-0002",
        role: "STAFF",
        status: "ENABLED",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date(),
      },
      {
        id: "staff-2",
        username: "jane_smith",
        email: "jane.smith@example.com",
        password: passwordHash,
        firstName: "Jane",
        lastName: "Smith",
        phone: "+1-555-0003",
        role: "STAFF",
        status: "ENABLED",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date(),
      },
    ]

    // Initialize sample orders
    this.orders = [
      {
        id: "order-1",
        customerName: "Alice Johnson",
        customerEmail: "alice@example.com",
        customerPhone: "+1-555-1001",
        items: [
          {
            id: "item-1",
            productName: "Wireless Headphones",
            quantity: 1,
            price: 99.99,
            total: 99.99,
          },
        ],
        status: "DELIVERED",
        totalAmount: 99.99,
        shippingAddress: "123 Main St, Anytown, ST 12345",
        notes: "Customer requested expedited shipping",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-15"),
        createdBy: "staff-1",
      },
      {
        id: "order-2",
        customerName: "Bob Wilson",
        customerEmail: "bob@example.com",
        customerPhone: "+1-555-1002",
        items: [
          {
            id: "item-2",
            productName: "Smartphone Case",
            quantity: 2,
            price: 24.99,
            total: 49.98,
          },
          {
            id: "item-3",
            productName: "Screen Protector",
            quantity: 2,
            price: 9.99,
            total: 19.98,
          },
        ],
        status: "PROCESSING",
        totalAmount: 69.96,
        shippingAddress: "456 Oak Ave, Another City, ST 67890",
        createdAt: new Date("2024-01-20"),
        updatedAt: new Date("2024-01-22"),
        createdBy: "staff-2",
      },
      {
        id: "order-3",
        customerName: "Carol Davis",
        customerEmail: "carol@example.com",
        items: [
          {
            id: "item-4",
            productName: "Bluetooth Speaker",
            quantity: 1,
            price: 79.99,
            total: 79.99,
          },
        ],
        status: "PENDING",
        totalAmount: 79.99,
        shippingAddress: "789 Pine Rd, Third Town, ST 13579",
        notes: "Gift wrapping requested",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
        createdBy: "admin-1",
      },
    ]

    // Initialize delivery agencies
    this.deliveryAgencies = [
      {
        id: "best-delivery",
        name: "Best Delivery",
        enabled: false,
        credentialsType: "username_password",
        credentialsUsername: "",
        credentialsPassword: "",
        settings: {
          autoSync: true,
          pollingInterval: 30,
          supportedRegions: [
            "Ariana",
            "Béja",
            "Ben Arous",
            "Bizerte",
            "Gabès",
            "Gafsa",
            "Jendouba",
            "Kairouan",
            "Kasserine",
            "Kébili",
            "La Manouba",
            "Le Kef",
            "Mahdia",
            "Médenine",
            "Monastir",
            "Nabeul",
            "Sfax",
            "Sidi Bouzid",
            "Siliana",
            "Sousse",
            "Tataouine",
            "Tozeur",
            "Tunis",
            "Zaghouan",
          ],
        },
        pollingInterval: 30,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date(),
      },
    ]

    // Initialize sample activities
    this.activities = [
      {
        id: "activity-1",
        type: "LOGIN",
        description: "User admin logged in successfully",
        userId: "admin-1",
        metadata: { loginMethod: "password" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        timestamp: new Date("2024-02-01T09:00:00Z"),
        createdAt: new Date("2024-02-01T09:00:00Z"),
      },
      {
        id: "activity-2",
        type: "ORDER_CREATED",
        description: "Order order-3 created for Carol Davis",
        userId: "admin-1",
        metadata: { orderId: "order-3", customerName: "Carol Davis" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        timestamp: new Date("2024-02-01T09:15:00Z"),
        createdAt: new Date("2024-02-01T09:15:00Z"),
      },
      {
        id: "activity-3",
        type: "USER_CREATED",
        description: "Created new user: jane_smith",
        userId: "admin-1",
        metadata: { createdUserId: "staff-2", targetUsername: "jane_smith" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        timestamp: new Date("2024-02-01T08:30:00Z"),
        createdAt: new Date("2024-02-01T08:30:00Z"),
      },
    ]

    this.initialized = true
    console.log(
      "✅ Mock database initialized with",
      this.users.length,
      "users,",
      this.orders.length,
      "orders,",
      this.deliveryAgencies.length,
      "delivery agencies, and",
      this.activities.length,
      "activities",
    )
  }

  // User operations
  public async findUserByUsername(username: string): Promise<User | null> {
    await this.initializeData()
    console.log("🔍 Looking for user with username:", username)
    const user = this.users.find((u) => u.username === username && u.status === "ENABLED")
    console.log("👤 User lookup result:", user ? `Found: ${user.username}` : "Not found")
    return user || null
  }

  public async findUserById(id: string): Promise<User | null> {
    await this.initializeData()
    const user = this.users.find((u) => u.id === id)
    return user || null
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    await this.initializeData()
    const user = this.users.find((u) => u.email === email)
    return user || null
  }

  public async getAllUsers(): Promise<User[]> {
    await this.initializeData()
    return this.users.filter((u) => u.status === "ENABLED")
  }

  public async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    await this.initializeData()
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.push(newUser)
    console.log("✅ User created:", newUser.username)
    return newUser
  }

  public async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    await this.initializeData()
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return null

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    }
    console.log("✅ User updated:", this.users[userIndex].username)
    return this.users[userIndex]
  }

  public async deleteUser(id: string): Promise<boolean> {
    await this.initializeData()
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return false

    // Soft delete by setting status to DISABLED
    this.users[userIndex].status = "DISABLED"
    this.users[userIndex].updatedAt = new Date()
    console.log("✅ User deleted (disabled):", this.users[userIndex].username)
    return true
  }

  // Order operations
  public async getAllOrders(): Promise<Order[]> {
    await this.initializeData()
    return this.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  public async findOrderById(id: string): Promise<Order | null> {
    await this.initializeData()
    const order = this.orders.find((o) => o.id === id)
    return order || null
  }

  public async createOrder(orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
    await this.initializeData()
    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.orders.push(newOrder)
    console.log("✅ Order created:", newOrder.id)
    return newOrder
  }

  public async updateOrder(id: string, orderData: Partial<Order>): Promise<Order | null> {
    await this.initializeData()
    const orderIndex = this.orders.findIndex((o) => o.id === id)
    if (orderIndex === -1) return null

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      ...orderData,
      updatedAt: new Date(),
    }
    console.log("✅ Order updated:", this.orders[orderIndex].id)
    return this.orders[orderIndex]
  }

  public async deleteOrder(id: string): Promise<boolean> {
    await this.initializeData()
    const orderIndex = this.orders.findIndex((o) => o.id === id)
    if (orderIndex === -1) return false

    this.orders.splice(orderIndex, 1)
    console.log("✅ Order deleted:", id)
    return true
  }

  // Activity operations
  public async createActivity(
    activityData: Omit<Activity, "id" | "timestamp" | "createdAt" | "user">,
  ): Promise<Activity> {
    await this.initializeData()
    const newActivity: Activity = {
      ...activityData,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      createdAt: new Date(),
    }

    // Add user relationship if userId is provided
    if (newActivity.userId) {
      const user = this.users.find((u) => u.id === newActivity.userId)
      if (user) {
        newActivity.user = user
      }
    }

    this.activities.unshift(newActivity) // Add to beginning for newest first
    console.log(`📝 Activity created: ${newActivity.type} - ${newActivity.description}`)
    return newActivity
  }

  public async getActivities(limit?: number, userId?: string): Promise<Activity[]> {
    await this.initializeData()
    let filtered = [...this.activities]

    // Add user relationships to all activities
    filtered = filtered.map((activity) => {
      if (activity.userId && !activity.user) {
        const user = this.users.find((u) => u.id === activity.userId)
        if (user) {
          return { ...activity, user }
        }
      }
      return activity
    })

    if (userId) {
      filtered = filtered.filter((activity) => activity.userId === userId)
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (limit && limit > 0) {
      return filtered.slice(0, limit)
    }

    return filtered
  }

  public async getActivitiesByType(type: string, limit?: number): Promise<Activity[]> {
    await this.initializeData()
    let filtered = this.activities.filter((activity) => activity.type === type)

    // Add user relationships
    filtered = filtered.map((activity) => {
      if (activity.userId && !activity.user) {
        const user = this.users.find((u) => u.id === activity.userId)
        if (user) {
          return { ...activity, user }
        }
      }
      return activity
    })

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (limit && limit > 0) {
      return filtered.slice(0, limit)
    }

    return filtered
  }

  public async getActivitiesCount(): Promise<number> {
    await this.initializeData()
    return this.activities.length
  }

  // Delivery Agency operations
  public async getAllDeliveryAgencies(): Promise<DeliveryAgency[]> {
    await this.initializeData()
    return this.deliveryAgencies
  }

  public async findDeliveryAgencyById(id: string): Promise<DeliveryAgency | null> {
    await this.initializeData()
    const agency = this.deliveryAgencies.find((a) => a.id === id)
    return agency || null
  }

  public async updateDeliveryAgency(id: string, agencyData: Partial<DeliveryAgency>): Promise<DeliveryAgency | null> {
    await this.initializeData()
    const agencyIndex = this.deliveryAgencies.findIndex((a) => a.id === id)
    if (agencyIndex === -1) return null

    this.deliveryAgencies[agencyIndex] = {
      ...this.deliveryAgencies[agencyIndex],
      ...agencyData,
      updatedAt: new Date(),
    }
    console.log("✅ Delivery agency updated:", this.deliveryAgencies[agencyIndex].id)
    return this.deliveryAgencies[agencyIndex]
  }

  // Delivery Shipment operations
  public async createDeliveryShipment(
    shipmentData: Omit<DeliveryShipment, "id" | "createdAt" | "updatedAt" | "lastStatusUpdate">,
  ): Promise<DeliveryShipment> {
    await this.initializeData()
    const newShipment: DeliveryShipment = {
      ...shipmentData,
      id: `shipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastStatusUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.deliveryShipments.push(newShipment)
    console.log("✅ Delivery shipment created:", newShipment.id)
    return newShipment
  }

  public async findDeliveryShipmentById(id: string): Promise<DeliveryShipment | null> {
    await this.initializeData()
    const shipment = this.deliveryShipments.find((s) => s.id === id)
    return shipment || null
  }

  public async findDeliveryShipmentByTrackingNumber(trackingNumber: string): Promise<DeliveryShipment | null> {
    await this.initializeData()
    const shipment = this.deliveryShipments.find((s) => s.trackingNumber === trackingNumber)
    return shipment || null
  }

  public async findDeliveryShipmentsByOrderId(orderId: string): Promise<DeliveryShipment[]> {
    await this.initializeData()
    return this.deliveryShipments.filter((s) => s.orderId === orderId)
  }

  public async getActiveDeliveryShipments(): Promise<DeliveryShipment[]> {
    await this.initializeData()
    const activeStatuses = ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]
    return this.deliveryShipments.filter((s) => activeStatuses.includes(s.status))
  }

  public async updateDeliveryShipment(
    id: string,
    shipmentData: Partial<DeliveryShipment>,
  ): Promise<DeliveryShipment | null> {
    await this.initializeData()
    const shipmentIndex = this.deliveryShipments.findIndex((s) => s.id === id)
    if (shipmentIndex === -1) return null

    this.deliveryShipments[shipmentIndex] = {
      ...this.deliveryShipments[shipmentIndex],
      ...shipmentData,
      updatedAt: new Date(),
      lastStatusUpdate: shipmentData.status ? new Date() : this.deliveryShipments[shipmentIndex].lastStatusUpdate,
    }
    console.log("✅ Delivery shipment updated:", this.deliveryShipments[shipmentIndex].id)
    return this.deliveryShipments[shipmentIndex]
  }

  public async getAllDeliveryShipments(limit?: number): Promise<DeliveryShipment[]> {
    await this.initializeData()
    const shipments = [...this.deliveryShipments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return limit ? shipments.slice(0, limit) : shipments
  }

  public async bulkUpdateDeliveryShipments(
    shipmentIds: string[],
    updateData: Partial<DeliveryShipment>,
  ): Promise<DeliveryShipment[]> {
    await this.initializeData()
    const updated: DeliveryShipment[] = []

    for (const id of shipmentIds) {
      const shipmentIndex = this.deliveryShipments.findIndex((s) => s.id === id)
      if (shipmentIndex !== -1) {
        this.deliveryShipments[shipmentIndex] = {
          ...this.deliveryShipments[shipmentIndex],
          ...updateData,
          updatedAt: new Date(),
        }
        updated.push(this.deliveryShipments[shipmentIndex])
      }
    }

    return updated
  }

  public async deleteDeliveryShipment(id: string): Promise<boolean> {
    await this.initializeData()
    const shipmentIndex = this.deliveryShipments.findIndex((s) => s.id === id)
    if (shipmentIndex === -1) return false

    // Soft delete by updating status
    this.deliveryShipments[shipmentIndex] = {
      ...this.deliveryShipments[shipmentIndex],
      status: "CANCELLED",
      updatedAt: new Date(),
    }

    return true
  }

  // Delivery Status Log operations
  public async createDeliveryStatusLog(
    logData: Omit<DeliveryStatusLog, "id" | "createdAt">,
  ): Promise<DeliveryStatusLog> {
    await this.initializeData()
    const newLog: DeliveryStatusLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }
    this.deliveryStatusLogs.push(newLog)
    console.log("✅ Delivery status log created:", newLog.id)
    return newLog
  }

  public async getDeliveryStatusLogsByShipmentId(shipmentId: string): Promise<DeliveryStatusLog[]> {
    await this.initializeData()
    return this.deliveryStatusLogs
      .filter((log) => log.shipmentId === shipmentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Statistics operations
  public async getOrderStats(): Promise<{
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }> {
    await this.initializeData()
    const stats = {
      total: this.orders.length,
      pending: this.orders.filter((o) => o.status === "PENDING").length,
      processing: this.orders.filter((o) => o.status === "PROCESSING").length,
      shipped: this.orders.filter((o) => o.status === "SHIPPED").length,
      delivered: this.orders.filter((o) => o.status === "DELIVERED").length,
      cancelled: this.orders.filter((o) => o.status === "CANCELLED").length,
    }
    return stats
  }

  public async getUserStats(): Promise<{
    total: number
    admins: number
    staff: number
    enabled: number
    disabled: number
  }> {
    await this.initializeData()
    const stats = {
      total: this.users.length,
      admins: this.users.filter((u) => u.role === "ADMIN").length,
      staff: this.users.filter((u) => u.role === "STAFF").length,
      enabled: this.users.filter((u) => u.status === "ENABLED").length,
      disabled: this.users.filter((u) => u.status === "DISABLED").length,
    }
    return stats
  }

  public async getActivityStats(): Promise<{
    total: number
    today: number
    thisWeek: number
    thisMonth: number
    byType: Record<string, number>
  }> {
    await this.initializeData()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const byType: Record<string, number> = {}
    this.activities.forEach((activity) => {
      byType[activity.type] = (byType[activity.type] || 0) + 1
    })

    return {
      total: this.activities.length,
      today: this.activities.filter((a) => a.timestamp >= today).length,
      thisWeek: this.activities.filter((a) => a.timestamp >= thisWeek).length,
      thisMonth: this.activities.filter((a) => a.timestamp >= thisMonth).length,
      byType,
    }
  }

  public async getDeliveryStats(): Promise<{
    totalShipments: number
    activeShipments: number
    deliveredShipments: number
    pendingShipments: number
    byAgency: Record<string, number>
    byStatus: Record<string, number>
  }> {
    await this.initializeData()

    const byAgency: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    this.deliveryShipments.forEach((shipment) => {
      byAgency[shipment.agencyId] = (byAgency[shipment.agencyId] || 0) + 1
      byStatus[shipment.status] = (byStatus[shipment.status] || 0) + 1
    })

    return {
      totalShipments: this.deliveryShipments.length,
      activeShipments: this.deliveryShipments.filter((s) =>
        ["PENDING", "CONFIRMED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(s.status),
      ).length,
      deliveredShipments: this.deliveryShipments.filter((s) => s.status === "DELIVERED").length,
      pendingShipments: this.deliveryShipments.filter((s) => s.status === "PENDING").length,
      byAgency,
      byStatus,
    }
  }

  // Prisma compatibility layer
  public user = {
    findUnique: async ({ where }: { where: { id?: string; username?: string; email?: string } }) => {
      if (where.id) return this.findUserById(where.id)
      if (where.username) return this.findUserByUsername(where.username)
      if (where.email) return this.findUserByEmail(where.email)
      return null
    },
    findFirst: async ({ where }: { where: any }) => {
      await this.initializeData()
      return (
        this.users.find((user) => {
          if (where.AND) {
            return where.AND.every((condition: any) => {
              if (condition.id?.not) return user.id !== condition.id.not
              if (condition.OR) {
                return condition.OR.some((orCondition: any) => {
                  if (orCondition.username) return user.username === orCondition.username
                  if (orCondition.email) return user.email === orCondition.email
                  return false
                })
              }
              return true
            })
          }
          if (where.OR) {
            return where.OR.some((condition: any) => {
              if (condition.username) return user.username === condition.username
              if (condition.email) return user.email === condition.email
              return false
            })
          }
          return true
        }) || null
      )
    },
    findMany: async ({ where, orderBy, select }: { where?: any; orderBy?: any; select?: any }) => {
      await this.initializeData()
      let users = this.users
      if (where?.status) {
        users = users.filter((u) => u.status === where.status)
      }
      if (orderBy?.createdAt === "desc") {
        users = users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }
      if (select) {
        return users.map((user) => {
          const result: any = {}
          Object.keys(select).forEach((key) => {
            if (select[key] && key in user) {
              result[key] = (user as any)[key]
            }
          })
          return result
        })
      }
      return users
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      return this.updateUser(where.id, data)
    },
  }

  public deliveryAgency = {
    findMany: async () => {
      return this.getAllDeliveryAgencies()
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.findDeliveryAgencyById(where.id)
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      return this.updateDeliveryAgency(where.id, data)
    },
  }

  public deliveryShipment = {
    create: async ({ data }: { data: any }) => {
      return this.createDeliveryShipment(data)
    },
    findUnique: async ({ where }: { where: { id?: string; trackingNumber?: string } }) => {
      if (where.id) return this.findDeliveryShipmentById(where.id)
      if (where.trackingNumber) return this.findDeliveryShipmentByTrackingNumber(where.trackingNumber)
      return null
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where?: { orderId?: string; agencyId?: string; status?: { in: string[] } }
      orderBy?: any
      take?: number
    }) => {
      await this.initializeData()
      let shipments = [...this.deliveryShipments]

      if (where?.orderId) {
        shipments = shipments.filter((s) => s.orderId === where.orderId)
      }
      if (where?.agencyId) {
        shipments = shipments.filter((s) => s.agencyId === where.agencyId)
      }
      if (where?.status?.in) {
        shipments = shipments.filter((s) => where.status!.in.includes(s.status))
      }

      if (orderBy?.createdAt === "desc") {
        shipments = shipments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }

      if (take) {
        shipments = shipments.slice(0, take)
      }

      return shipments
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      return this.updateDeliveryShipment(where.id, data)
    },
    updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: any }) => {
      const updated = await this.bulkUpdateDeliveryShipments(where.id.in, data)
      return { count: updated.length }
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const success = await this.deleteDeliveryShipment(where.id)
      if (!success) throw new Error("Shipment not found")
      return { id: where.id }
    },
  }

  public deliveryStatusLog = {
    create: async ({ data }: { data: any }) => {
      return this.createDeliveryStatusLog(data)
    },
    findMany: async ({ where, orderBy }: { where?: { shipmentId: string }; orderBy?: any }) => {
      await this.initializeData()
      let logs = this.deliveryStatusLogs
      if (where?.shipmentId) {
        logs = logs.filter((log) => log.shipmentId === where.shipmentId)
      }
      if (orderBy?.timestamp === "desc" || orderBy?.createdAt === "desc") {
        logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      }
      return logs
    },
  }

  public $disconnect = async () => {
    // Mock disconnect - no-op for mock implementation
    console.log("🔌 Mock Prisma disconnected")
  }

  public $connect = async () => {
    // Mock connect - no-op for mock implementation
    console.log("🔌 Mock Prisma connected")
  }

  // Additional Prisma compatibility for transactions
  public $transaction = async (fn: any) => {
    // For mock implementation, just execute the function
    return fn(this)
  }

  // Order compatibility methods
  public order = {
    findMany: async ({
      where,
      orderBy,
      select,
      include,
    }: { where?: any; orderBy?: any; select?: any; include?: any }) => {
      await this.initializeData()
      let orders = this.orders

      if (where?.status) {
        orders = orders.filter((o) => o.status === where.status)
      }
      if (where?.createdBy) {
        orders = orders.filter((o) => o.createdBy === where.createdBy)
      }
      if (orderBy?.createdAt === "desc") {
        orders = orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }

      if (select) {
        return orders.map((order) => {
          const result: any = {}
          Object.keys(select).forEach((key) => {
            if (select[key] && key in order) {
              result[key] = (order as any)[key]
            }
          })
          return result
        })
      }

      return orders
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.findOrderById(where.id)
    },
    create: async ({ data }: { data: any }) => {
      return this.createOrder(data)
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      return this.updateOrder(where.id, data)
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const success = await this.deleteOrder(where.id)
      if (!success) throw new Error("Order not found")
      return { id: where.id }
    },
    count: async ({ where }: { where?: any }) => {
      await this.initializeData()
      let orders = this.orders

      if (where?.status) {
        orders = orders.filter((o) => o.status === where.status)
      }
      if (where?.createdBy) {
        orders = orders.filter((o) => o.createdBy === where.createdBy)
      }

      return orders.length
    },
  }

  // Activity compatibility methods
  public activity = {
    findMany: async ({ where, orderBy, take }: { where?: any; orderBy?: any; take?: number }) => {
      await this.initializeData()
      let activities = [...this.activities]

      // Add user relationships
      activities = activities.map((activity) => {
        if (activity.userId && !activity.user) {
          const user = this.users.find((u) => u.id === activity.userId)
          if (user) {
            return { ...activity, user }
          }
        }
        return activity
      })

      if (where?.userId) {
        activities = activities.filter((a) => a.userId === where.userId)
      }
      if (where?.type) {
        activities = activities.filter((a) => a.type === where.type)
      }

      if (orderBy?.timestamp === "desc" || orderBy?.createdAt === "desc") {
        activities = activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      }

      if (take) {
        activities = activities.slice(0, take)
      }

      return activities
    },
    create: async ({ data }: { data: any }) => {
      return this.createActivity(data)
    },
    count: async ({ where }: { where?: any }) => {
      await this.initializeData()
      let activities = this.activities

      if (where?.userId) {
        activities = activities.filter((a) => a.userId === where.userId)
      }
      if (where?.type) {
        activities = activities.filter((a) => a.type === where.type)
      }

      return activities.length
    },
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: MockPrisma | undefined
}

export const prismaClient = globalForPrisma.prisma ?? MockPrisma.getInstance()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient

export default prismaClient
