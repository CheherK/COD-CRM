"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { User, Lock, Activity, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { updateProfile, changePassword } from "@/lib/auth"
import type { UpdateProfileData, ChangePasswordData } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ActivityFeed } from "@/components/activity-feed"
import { useLanguage } from "@/contexts/language-context"

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()

  // Profile form state
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    username: user?.username || "",
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password form state
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setProfileLoading(true)
    try {
      const updatedUser = await updateProfile(user.id, profileData)
      if (updatedUser) {
        toast({
          title: t("success"),
          description: t("profileUpdatedSuccessfully"),
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateProfile"),
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t("error"),
        description: t("newPasswordsDoNotMatch"),
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: t("error"),
        description: t("passwordMustBeAtLeast6Characters"),
        variant: "destructive",
      })
      return
    }

    setPasswordLoading(true)
    try {
      const success = await changePassword(user.id, passwordData.currentPassword, passwordData.newPassword)
      if (success) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        toast({
          title: t("success"),
          description: t("passwordChangedSuccessfully"),
        })
      } else {
        toast({
          title: t("error"),
          description: t("currentPasswordIncorrect"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToChangePassword"),
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("settings")}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t("manageAccountSettingsPreferences")}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("profile")}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t("security")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("activity")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("profileInformation")}</CardTitle>
              <CardDescription>{t("updatePersonalInformationContactDetails")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      placeholder={t("enterFirstName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      placeholder={t("enterLastName")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">{t("username")}</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder={t("enterUsername")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder={t("enterEmailAddress")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder={t("enterPhoneNumber")}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{t("accountStatus")}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("yourCurrentAccountInformation")}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>
                        {user?.role === "ADMIN" ? t("admin") : t("staff")}
                      </Badge>
                    </div>
                    <div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {user?.status === "ENABLED" ? t("enabled") : t("disabled")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="bg-purple-600 hover:bg-purple-700">
                    {profileLoading ? t("updating") : t("updateProfile")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t("changePassword")}</CardTitle>
              <CardDescription>{t("updatePasswordKeepAccountSecure")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t("makePasswordAtLeast6CharactersLong")}</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder={t("enterCurrentPassword")}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder={t("enterNewPassword")}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder={t("confirmNewPassword")}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordLoading} className="bg-purple-600 hover:bg-purple-700">
                    {passwordLoading ? t("changing") : t("changePassword")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityFeed userId={user?.id} limit={20} title={t("yourActivityHistory")} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
