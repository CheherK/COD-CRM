"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Edit, Trash2, Shield, User, AlertCircle, Eye, EyeOff } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { getAllUsers, createUser, updateUser, deleteUser } from "@/lib/auth"
import type { AuthUser } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { ActivityFeed } from "@/components/activity-feed"
import { useLanguage } from "@/contexts/language-context"

interface FormErrors {
  username?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
}

interface NewUserForm {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: "ADMIN" | "STAFF"
}

function TeamPageContent() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [newUser, setNewUser] = useState<NewUserForm>({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "STAFF",
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  // Validation functions
  const validateUsername = (username: string): string | undefined => {
    if (!username.trim()) return t("usernameRequired")
    if (username.length < 3) return t("usernameAtLeast3Characters")
    if (username.length > 50) return t("usernameLessThan50Characters")
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return t("usernameOnlyLettersNumbersHyphensUnderscores")
    return undefined
  }

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return t("emailRequired")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return t("enterValidEmailAddress")
    return undefined
  }

  const validatePassword = (password: string): string | undefined => {
    if (!password) return t("passwordRequired")
    if (password.length < 6) return t("passwordAtLeast6Characters")
    if (password.length > 100) return t("passwordLessThan100Characters")
    return undefined
  }

  const validatePhone = (phone: string): string | undefined => {
    if (phone && !/^[+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-$$$$]/g, ""))) {
      return t("enterValidPhoneNumber")
    }
    return undefined
  }

  const validateName = (name: string, fieldName: string): string | undefined => {
    if (name && name.length > 50)
      return fieldName === "First name" ? t("firstNameLessThan50Characters") : t("lastNameLessThan50Characters")
    return undefined
  }

  // Real-time validation for add user form
  const handleNewUserChange = (field: keyof NewUserForm, value: string) => {
    setNewUser((prev) => ({ ...prev, [field]: value }))

    // Validate field immediately
    let error: string | undefined
    switch (field) {
      case "username":
        error = validateUsername(value)
        break
      case "email":
        error = validateEmail(value)
        break
      case "password":
        error = validatePassword(value)
        break
      case "firstName":
        error = validateName(value, "First name")
        break
      case "lastName":
        error = validateName(value, "Last name")
        break
      case "phone":
        error = validatePhone(value)
        break
    }

    setFormErrors((prev) => ({
      ...prev,
      [field]: error,
    }))
  }

  // Real-time validation for edit user form
  const handleEditUserChange = (field: string, value: string) => {
    if (!editingUser) return

    setEditingUser((prev) => (prev ? { ...prev, [field]: value } : null))

    // Validate field immediately
    let error: string | undefined
    switch (field) {
      case "username":
        error = validateUsername(value)
        break
      case "email":
        error = validateEmail(value)
        break
      case "firstName":
        error = validateName(value, "First name")
        break
      case "lastName":
        error = validateName(value, "Last name")
        break
      case "phone":
        error = validatePhone(value)
        break
    }

    setEditFormErrors((prev) => ({
      ...prev,
      [field]: error,
    }))
  }

  const validateForm = (formData: NewUserForm): FormErrors => {
    const errors: FormErrors = {}

    errors.username = validateUsername(formData.username)
    errors.email = validateEmail(formData.email)
    errors.password = validatePassword(formData.password)
    errors.firstName = validateName(formData.firstName, "First name")
    errors.lastName = validateName(formData.lastName, "Last name")
    errors.phone = validatePhone(formData.phone)

    return Object.fromEntries(Object.entries(errors).filter(([_, value]) => value !== undefined)) as FormErrors
  }

  const validateEditForm = (userData: Partial<AuthUser>): FormErrors => {
    const errors: FormErrors = {}

    if (userData.username) errors.username = validateUsername(userData.username)
    if (userData.email) errors.email = validateEmail(userData.email)
    if (userData.firstName) errors.firstName = validateName(userData.firstName, "First name")
    if (userData.lastName) errors.lastName = validateName(userData.lastName, "Last name")
    if (userData.phone) errors.phone = validatePhone(userData.phone)

    return Object.fromEntries(Object.entries(errors).filter(([_, value]) => value !== undefined)) as FormErrors
  }

  const handleAddUser = async () => {
    const errors = validateForm(newUser)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: t("validationError"),
        description: t("pleaseFixErrorsInForm"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const createdUser = await createUser(newUser)
      setUsers([...users, createdUser])
      setIsAddUserOpen(false)

      // Reset form
      setNewUser({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "STAFF",
      })
      setFormErrors({})

      toast({
        title: t("success"),
        description: t("userCreatedSuccessfully"),
      })
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("failedToCreateUser"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (user: AuthUser) => {
    setEditingUser(user)
    setEditFormErrors({})
    setIsEditUserOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    const errors = validateEditForm(editingUser)
    setEditFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: t("validationError"),
        description: t("pleaseFixErrorsInForm"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updatedUser = await updateUser(editingUser.id, editingUser)
      if (updatedUser) {
        setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
        setIsEditUserOpen(false)
        setEditingUser(null)
        setEditFormErrors({})

        toast({
          title: t("success"),
          description: t("userUpdatedSuccessfully"),
        })
      }
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("failedToUpdateUser"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(t("areYouSureDeleteUser"))) {
      try {
        await deleteUser(userId)
        setUsers(users.filter((u) => u.id !== userId))
        toast({
          title: t("success"),
          description: t("userDeletedSuccessfully"),
        })
      } catch (error: any) {
        toast({
          title: t("error"),
          description: error.message || t("failedToDeleteUser"),
          variant: "destructive",
        })
      }
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Fix the validation logic - check if there are any errors
  const hasFormErrors = Object.keys(formErrors).length > 0
  const hasEditFormErrors = Object.keys(editFormErrors).length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("teamManagement")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("manageTeamMembersPermissions")}</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {t("addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("addUser")}</DialogTitle>
              <DialogDescription>
                {t("createNewTeamMemberAccount")} {t("allFieldsMarkedRequired")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  {t("username")} *
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => handleNewUserChange("username", e.target.value)}
                  placeholder={t("enterUsername")}
                  className={formErrors.username ? "border-red-500 focus:border-red-500" : ""}
                />
                {formErrors.username && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.username}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("email")} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => handleNewUserChange("email", e.target.value)}
                  placeholder={t("enterEmailAddress")}
                  className={formErrors.email ? "border-red-500 focus:border-red-500" : ""}
                />
                {formErrors.email && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.email}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("password")} *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => handleNewUserChange("password", e.target.value)}
                    placeholder={t("enterPassword")}
                    className={formErrors.password ? "border-red-500 focus:border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {formErrors.password && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.password}
                  </div>
                )}
              </div>

              <Separator />

              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  {t("firstName")}
                </Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => handleNewUserChange("firstName", e.target.value)}
                  placeholder={t("enterFirstName")}
                  className={formErrors.firstName ? "border-red-500 focus:border-red-500" : ""}
                />
                {formErrors.firstName && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.firstName}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  {t("lastName")}
                </Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => handleNewUserChange("lastName", e.target.value)}
                  placeholder={t("enterLastName")}
                  className={formErrors.lastName ? "border-red-500 focus:border-red-500" : ""}
                />
                {formErrors.lastName && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.lastName}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t("phone")}
                </Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => handleNewUserChange("phone", e.target.value)}
                  placeholder={t("enterPhoneNumber")}
                  className={formErrors.phone ? "border-red-500 focus:border-red-500" : ""}
                />
                {formErrors.phone && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.phone}
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  {t("role")} *
                </Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: "ADMIN" | "STAFF") => handleNewUserChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">{t("staff")}</SelectItem>
                    <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                onClick={handleAddUser}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={hasFormErrors || isSubmitting}
              >
                {isSubmitting ? t("creating") : t("createUser")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t("searchTeamMembersByName")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("teamMembers")}</CardTitle>
          <CardDescription>
            {filteredUsers.length} {t("teamMembersFound")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("username")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "-"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.role === "ADMIN" ? (
                          <Shield className="h-4 w-4 text-purple-600" />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role === "ADMIN" ? t("admin") : t("staff")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.status === "ENABLED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }
                      >
                        {user.status === "ENABLED" ? t("enabled") : t("disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Team Activities */}
      <ActivityFeed title={t("teamActivity")} limit={15} />

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editUser")}</DialogTitle>
            <DialogDescription>{t("updateUserInformationSettings")}</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-6 py-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-sm font-medium">
                  {t("username")} *
                </Label>
                <Input
                  id="edit-username"
                  value={editingUser.username}
                  onChange={(e) => handleEditUserChange("username", e.target.value)}
                  className={editFormErrors.username ? "border-red-500 focus:border-red-500" : ""}
                />
                {editFormErrors.username && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {editFormErrors.username}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  {t("email")} *
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => handleEditUserChange("email", e.target.value)}
                  className={editFormErrors.email ? "border-red-500 focus:border-red-500" : ""}
                />
                {editFormErrors.email && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {editFormErrors.email}
                  </div>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-firstName" className="text-sm font-medium">
                  {t("firstName")}
                </Label>
                <Input
                  id="edit-firstName"
                  value={editingUser.firstName || ""}
                  onChange={(e) => handleEditUserChange("firstName", e.target.value)}
                  className={editFormErrors.firstName ? "border-red-500 focus:border-red-500" : ""}
                />
                {editFormErrors.firstName && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {editFormErrors.firstName}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-lastName" className="text-sm font-medium">
                  {t("lastName")}
                </Label>
                <Input
                  id="edit-lastName"
                  value={editingUser.lastName || ""}
                  onChange={(e) => handleEditUserChange("lastName", e.target.value)}
                  className={editFormErrors.lastName ? "border-red-500 focus:border-red-500" : ""}
                />
                {editFormErrors.lastName && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {editFormErrors.lastName}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-medium">
                  {t("phone")}
                </Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone || ""}
                  onChange={(e) => handleEditUserChange("phone", e.target.value)}
                  className={editFormErrors.phone ? "border-red-500 focus:border-red-500" : ""}
                />
                {editFormErrors.phone && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {editFormErrors.phone}
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium">
                  {t("role")} *
                </Label>
                <Select value={editingUser.role} onValueChange={(value) => handleEditUserChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">{t("staff")}</SelectItem>
                    <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">
                  {t("status")} *
                </Label>
                <Select value={editingUser.status} onValueChange={(value) => handleEditUserChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENABLED">{t("enabled")}</SelectItem>
                    <SelectItem value="DISABLED">{t("disabled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              onClick={handleUpdateUser}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={hasEditFormErrors || isSubmitting}
            >
              {isSubmitting ? t("updating") : t("updateUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TeamPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <TeamPageContent />
    </AuthGuard>
  )
}
