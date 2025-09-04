import type { AuthUser, CreateUserData, UpdateProfileData, ChangePasswordData } from "./types"

// User management functions (API calls)
export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    console.log("🔍 Fetching all users...")

    const response = await fetch("/api/users", {
      method: "GET",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      console.error("❌ Failed to fetch users:", errorData)
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Users fetched successfully:", data.users?.length || 0)

    return data.users || []
  } catch (error) {
    console.error("❌ Error fetching users:", error)
    throw error
  }
}

export async function createUser(userData: CreateUserData): Promise<AuthUser> {
  try {
    console.log("🔍 Creating user:", userData.username)

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ User created successfully:", data.user?.username)

    return data.user
  } catch (error) {
    console.error("❌ Error creating user:", error)
    throw error
  }
}

export async function updateUser(userId: string, userData: Partial<CreateUserData>): Promise<AuthUser> {
  try {
    console.log("🔍 Updating user:", userId)

    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ User updated successfully:", data.user?.username)

    return data.user
  } catch (error) {
    console.error("❌ Error updating user:", error)
    throw error
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    console.log("🔍 Deleting user:", userId)

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    console.log("✅ User deleted successfully")
  } catch (error) {
    console.error("❌ Error deleting user:", error)
    throw error
  }
}

// Permission checking functions
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "ADMIN"
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (user.role === "ADMIN") return true
  return user.permissions?.[permission] === true
}

// Profile management functions
export async function updateProfile(profileData: UpdateProfileData): Promise<AuthUser> {
  try {
    console.log("🔍 Updating profile...")

    const response = await fetch("/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(profileData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Profile updated successfully")

    return data.user
  } catch (error) {
    console.error("❌ Error updating profile:", error)
    throw error
  }
}

export async function changePassword(passwordData: ChangePasswordData): Promise<Boolean> {
  try {
    console.log("🔍 Changing password...")

    const response = await fetch("/api/users/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(passwordData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    console.log("✅ Password changed successfully")
    return true
  } catch (error) {
    console.error("❌ Error changing password:", error)
    throw error
  }
}

// Authentication functions
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    console.log("🔍 Getting current user...")

    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    })

    if (!response.ok) {
      if (response.status === 401) {
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Current user retrieved:", data.user?.username)

    return data.user
  } catch (error) {
    console.error("❌ Error getting current user:", error)
    return null
  }
}
