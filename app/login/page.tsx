"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    console.log("🔐 Login form submitted with:", { username, password })

    try {
      const success = await login({ username, password })

      if (success) {
        console.log("✅ Login successful, redirecting to dashboard")
        if (user?.role === "ADMIN") {
          router.push("/dashboard")
        } else {
          router.push("/dashboard/orders")
        }
      } else {
        console.log("❌ Login failed")
        setError("Invalid username or password")
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      setError("An error occurred during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoUsername: string, demoPassword: string) => {
    console.log("🎯 Demo login clicked:", demoUsername)
    setUsername(demoUsername)
    setPassword(demoPassword)
    setError("")
    setLoading(true)

    try {
      const success = await login({ username: demoUsername, password: demoPassword })

      if (success) {
        console.log("✅ Demo login successful, redirecting to dashboard")
        if (user?.role === "ADMIN") {
          router.push("/dashboard")
        } else {
          router.push("/dashboard/orders")
        }
      } else {
        console.log("❌ Demo login failed")
        setError("Demo login failed. Please try again.")
      }
    } catch (error) {
      console.error("❌ Demo login error:", error)
      setError("An error occurred during demo login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in to CRM</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => handleDemoLogin("admin", "password")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Demo Admin (admin / password)"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => handleDemoLogin("john_doe", "password")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Demo Staff (john_doe / password)"}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo credentials:</p>
            <p>
              <strong>Admin:</strong> admin / password
            </p>
            <p>
              <strong>Staff:</strong> john_doe / password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
