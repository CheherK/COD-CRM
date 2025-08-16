import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import prisma from "./prisma"
import type { User, Role, UserStatus } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production"

export interface TokenPayload {
  userId: string
  username: string
  role: Role
  iat?: number
  exp?: number
}

export interface AuthUser extends User {
  permissions?: Record<string, boolean>
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  })
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    console.log("🔍 Verifying token:", token.substring(0, 20) + "...")

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    console.log("✅ Token verified for user:", decoded.username)

    return decoded
  } catch (error) {
    console.error("❌ Token verification failed:", error)
    return null
  }
}

// Get user from token (with fresh database lookup)
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const tokenData = verifyToken(token)

    if (!tokenData) {
      console.log("❌ Invalid token data")
      return null
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    })

    if (!user || user.status !== "ENABLED") {
      console.log("❌ User not found or disabled:", tokenData.userId)
      return null
    }

    console.log("✅ User retrieved from token:", user.username)
    return user as AuthUser
  } catch (error) {
    console.error("❌ Error getting user from token:", error)
    return null
  }
}

// Authenticate user with username and password
export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  try {
    console.log("🔐 Authenticating user:", username)

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      console.log("❌ User not found:", username)
      return null
    }

    if (user.status !== "ENABLED") {
      console.log("❌ User account disabled:", username)
      return null
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", username)
      return null
    }

    console.log("✅ Authentication successful for user:", user.username)
    return user as AuthUser
  } catch (error) {
    console.error("❌ Authentication error:", error)
    return null
  }
}

// Verify password
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    console.error("❌ Password verification error:", error)
    return false
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 12)
  } catch (error) {
    console.error("❌ Password hashing error:", error)
    throw new Error("Failed to hash password")
  }
}

// Extract user from request (helper function for API routes)
export async function extractUserFromRequest(request: Request): Promise<AuthUser | null> {
  try {
    // Try to get token from cookies
    const cookieHeader = request.headers.get("cookie")

    if (!cookieHeader) {
      console.log("❌ No cookie header found")
      return null
    }

    // Parse cookies manually
    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=")
        if (key && value) {
          acc[key] = decodeURIComponent(value)
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const token = cookies["auth-token"]

    if (!token) {
      console.log("❌ No auth-token cookie found")
      return null
    }

    console.log("🔍 Found auth token in cookies")
    return await getUserFromToken(token)
  } catch (error) {
    console.error("❌ Error extracting user from request:", error)
    return null
  }
}

// User management functions
export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    const users = await prisma.user.findMany({
      where: { status: "ENABLED" },
      orderBy: { createdAt: "desc" },
    })

    return users as AuthUser[]
  } catch (error) {
    console.error("❌ Error getting all users:", error)
    return []
  }
}

export async function createUser(userData: {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: Role
}): Promise<AuthUser> {
  try {
    const hashedPassword = await hashPassword(userData.password)

    const newUser = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || "STAFF",
        status: "ENABLED",
      },
    })

    console.log("✅ User created in database:", newUser.username)
    return newUser as AuthUser
  } catch (error) {
    console.error("❌ Error creating user:", error)
    throw new Error("Failed to create user")
  }
}

export async function updateUser(
  id: string,
  userData: Partial<{
    username: string
    email: string
    firstName: string
    lastName: string
    phone: string
    role: Role
    status: UserStatus
  }>,
): Promise<AuthUser | null> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: userData,
    })

    console.log("✅ User updated in database:", updatedUser.username)
    return updatedUser as AuthUser
  } catch (error) {
    console.error("❌ Error updating user:", error)
    return null
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    // Soft delete by setting status to DISABLED
    await prisma.user.update({
      where: { id },
      data: { status: "DISABLED" },
    })

    console.log("✅ User deleted (disabled) in database:", id)
    return true
  } catch (error) {
    console.error("❌ Error deleting user:", error)
    return false
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) return false

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) return false

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    })

    console.log("✅ Password changed in database for user:", userId)
    return true
  } catch (error) {
    console.error("❌ Error changing password:", error)
    return false
  }
}
