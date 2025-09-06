"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Truck,
  Settings,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"

interface DeliveryAgency {
  id: string
  name: string
  enabled: boolean
  supportedRegions: string[]
  credentialsType: "username_password" | "email_password" | "api_key"
  credentialsUsername?: string
  credentialsEmail?: string
  credentialsPassword?: string
  credentialsApiKey?: string
  settings: Record<string, any>
  webhookUrl?: string
  pollingInterval: number
  lastSync?: string
  createdAt: string
  updatedAt: string
}

interface DeliveryAgenciesProps {
  agencies: DeliveryAgency[]
  onDataChange: () => void
}

export function DeliveryAgencies({ agencies, onDataChange }: DeliveryAgenciesProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [savingAgency, setSavingAgency] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [editingAgency, setEditingAgency] = useState<DeliveryAgency | null>(null)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleAgencyToggle = async (agencyId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/delivery/agencies/${agencyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        onDataChange()
        toast({
          title: t("success"),
          description: enabled ? t("agencyEnabled") : t("agencyDisabled"),
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update agency")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAgency"),
        variant: "destructive",
      })
    }
  }

  const handleTestConnection = async (agencyId: string) => {
    try {
      setTesting(agencyId)

      console.log("Testing connection for agency:", agencyId);

      const response = await fetch("/api/delivery/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agencyId }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t("success"),
          description: t("connectionTestSuccessful"),
        })
      } else {
        toast({
          title: t("error"),
          description: result.error || t("connectionTestFailed"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("connectionTestFailed"),
        variant: "destructive",
      })
    } finally {
      setTesting(null)
    }
  }

  const handleEditAgency = (agency: DeliveryAgency) => {
    setEditingAgency({ ...agency })
    setIsEditDialogOpen(true)
  }

  const handleSaveAgency = async () => {
    setSavingAgency(true) 
    console.log("Saving agency:", editingAgency)
    if (!editingAgency) return

    try {
      const response = await fetch(`/api/delivery/agencies/${editingAgency.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: editingAgency.enabled,
          credentials: {
            username: editingAgency.credentialsUsername,
            email: editingAgency.credentialsEmail,
            password: editingAgency.credentialsPassword,
            apiKey: editingAgency.credentialsApiKey,
          },
          settings: editingAgency.settings,
          pollingInterval: editingAgency.pollingInterval,
        }),
      })

      if (response.ok) {
        onDataChange()
        setIsEditDialogOpen(false)
        setEditingAgency(null)

        toast({
          title: t("success"),
          description: t("agencyUpdatedSuccessfully"),
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update agency")
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failedToUpdateAgency"),
        variant: "destructive",
      })
    } finally {
      setSavingAgency(false)
    }
  }

  const toggleCredentialVisibility = (agencyId: string, field: string) => {
    setShowCredentials((prev) => ({
      ...prev,
      [agencyId + field]: !prev[agencyId + field],
    }))
  }

  return (
    <div className="grid gap-6">
      {agencies.map((agency) => (
        <Card key={agency.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-purple-600" />
                <div>
                  <CardTitle>{agency.name}</CardTitle>
                  <CardDescription>
                    {t("lastSync")}: {agency.lastSync ? new Date(agency.lastSync).toLocaleString() : t("never")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={agency.enabled}
                  onCheckedChange={(enabled) => handleAgencyToggle(agency.id, enabled)}
                />
                <Badge variant={agency.enabled ? "default" : "secondary"}>
                  {agency.enabled ? t("enabled") : t("disabled")}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t("credentialsType")}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agency?.credentialsType?.replace("_", " ").toUpperCase() || t("undefined")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t("pollingInterval")}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agency.pollingInterval} {t("seconds")}
                </p>
              </div>
              {agency.credentialsUsername && (
                <div>
                  <Label className="text-sm font-medium">{t("username")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {showCredentials[agency.id + "username"] ? agency.credentialsUsername : "••••••••"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => toggleCredentialVisibility(agency.id, 'username')}>
                      {showCredentials[agency.id + "username"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {agency.credentialsEmail && (
                <div>
                  <Label className="text-sm font-medium">{t("email")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {showCredentials[agency.id + "email"] ? agency.credentialsEmail : "••••••••"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => toggleCredentialVisibility(agency.id, 'email')}>
                      {showCredentials[agency.id + "email"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {agency.credentialsApiKey && (
                <div>
                  <Label className="text-sm font-medium">{t("apiKeys")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {showCredentials[agency.id + "apiKey"] ? agency.credentialsApiKey : "••••••••"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => toggleCredentialVisibility(agency.id, 'apiKey')}>
                      {showCredentials[agency.id + "apiKey"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {agency.credentialsPassword && (
                <div>
                  <Label className="text-sm font-medium">{t("password")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {showCredentials[agency.id + "password"] ? agency.credentialsPassword : "••••••••"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => toggleCredentialVisibility(agency.id, 'password')}>
                      {showCredentials[agency.id + "password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {agency.supportedRegions && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">{t("supportedRegions")}</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {agency.supportedRegions.slice(0, 5).map((region: string) => (
                      <Badge key={region} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                    {agency.supportedRegions.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{agency.supportedRegions.length - 5} {t("more")}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => handleEditAgency(agency)}>
                <Settings className="h-4 w-4 mr-2" />
                {t("configure")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection(agency.id)}
                disabled={testing === agency.id || !agency.enabled}
              >
                <TestTube className={`h-4 w-4 mr-2 ${testing === agency.id ? "animate-spin" : ""}`} />
                {testing === agency.id ? t("testing") : t("testConnection")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Agency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("configureAgency")}</DialogTitle>
            <DialogDescription>{t("updateAgencyCredentialsSettings")}</DialogDescription>
          </DialogHeader>

          {editingAgency && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agency-name">{t("agencyName")}</Label>
                  <Input id="agency-name" value={editingAgency.name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="polling-interval">
                    {t("pollingInterval")} ({t("seconds")})
                  </Label>
                  <Input
                    id="polling-interval"
                    type="number"
                    value={editingAgency.pollingInterval}
                    onChange={(e) =>
                      setEditingAgency({
                        ...editingAgency,
                        pollingInterval: Number.parseInt(e.target.value) || 300,
                      })
                    }
                  />
                </div>
              </div>

              {editingAgency.credentialsType === "username_password" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">{t("username")}</Label>
                    <Input
                      id="username"
                      value={editingAgency.credentialsUsername || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsUsername: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={editingAgency.credentialsPassword || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingAgency.credentialsType === "email_password" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingAgency.credentialsEmail || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={editingAgency.credentialsPassword || ""}
                      onChange={(e) =>
                        setEditingAgency({
                          ...editingAgency,
                          credentialsPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingAgency.credentialsType === "api_key" && (
                <div>
                  <Label htmlFor="api-key">{t("apiKey")}</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={editingAgency.credentialsApiKey || ""}
                    onChange={(e) =>
                      setEditingAgency({
                        ...editingAgency,
                        credentialsApiKey: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-sync"
                  checked={editingAgency.settings?.autoSync !== false}
                  onCheckedChange={(checked) =>
                    setEditingAgency({
                      ...editingAgency,
                      settings: {
                        ...editingAgency.settings,
                        autoSync: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="auto-sync">{t("enableAutoSync")}</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveAgency} className="bg-purple-600 hover:bg-purple-700" disabled={savingAgency}>
              {savingAgency ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}