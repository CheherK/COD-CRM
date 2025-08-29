// lib/auth-server.ts
import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import prisma from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key"

export interface AuthUser {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  role: "ADMIN" | "STAFF"
  status: "ENABLED" | "DISABLED"
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role: "ADMIN" | "STAFF"
}

export interface UpdateUserData {
  username?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: "ADMIN" | "STAFF"
  status?: "ENABLED" | "DISABLED"
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      status: decoded.status || "ENABLED"
    }
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ],
        status: "ENABLED"
      }
    })

    if (!user) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role as "ADMIN" | "STAFF",
      status: user.status as "ENABLED" | "DISABLED"
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export async function extractUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return null
    }

    const user = verifyToken(token)
    if (!user) {
      return null
    }

    // Verify user still exists and is enabled
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    })

    if (!dbUser || dbUser.status !== "ENABLED") {
      return null
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.firstName || undefined,
      lastName: dbUser.lastName || undefined,
      role: dbUser.role as "ADMIN" | "STAFF",
      status: dbUser.status as "ENABLED" | "DISABLED"
    }
  } catch (error) {
    console.error("Error extracting user from request:", error)
    return null
  }
}

export async function createUser(userData: CreateUserData): Promise<AuthUser> {
  const hashedPassword = await bcrypt.hash(userData.password, 12)

  const user = await prisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      phone: userData.phone || null,
      role: userData.role,
      status: "ENABLED"
    }
  })

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role as "ADMIN" | "STAFF",
    status: user.status as "ENABLED" | "DISABLED"
  }
}

export async function updateUser(userId: string, updateData: UpdateUserData): Promise<AuthUser | null> {
  try {
    const data: any = {}

    if (updateData.username !== undefined) data.username = updateData.username
    if (updateData.email !== undefined) data.email = updateData.email
    if (updateData.firstName !== undefined) data.firstName = updateData.firstName
    if (updateData.lastName !== undefined) data.lastName = updateData.lastName
    if (updateData.phone !== undefined) data.phone = updateData.phone
    if (updateData.role !== undefined) data.role = updateData.role
    if (updateData.status !== undefined) data.status = updateData.status

    if (updateData.password) {
      data.password = await bcrypt.hash(updateData.password, 12)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data
    })

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role as "ADMIN" | "STAFF",
      status: user.status as "ENABLED" | "DISABLED"
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return null
  }
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role as "ADMIN" | "STAFF",
      status: user.status as "ENABLED" | "DISABLED"
    }
  } catch (error) {
    console.error("Error getting user by ID:", error)
    return null
  }
}