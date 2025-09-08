"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  Truck,
  Menu,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  ShoppingCart,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"

const navigation = [
  {
    name: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    name: "orders",
    href: "/dashboard/orders",
    icon: Package,
    roles: ["ADMIN", "STAFF"],
  },
  {
    name: "products",
    href: "/dashboard/products",
    icon: ShoppingCart,
    roles: ["ADMIN", "STAFF"],
  },
  {
    name: "analytics",
    icon: BarChart3,
    roles: ["ADMIN"],
    children: [
      {
        name: "teamStats",
        href: "/dashboard/analytics/team",
        icon: TrendingUp,
        roles: ["ADMIN"],
      },
      {
        name: "deliveryStats",
        href: "/dashboard/analytics/delivery",
        icon: Truck,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    name: "team",
    href: "/dashboard/team",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    name: "deliveryManagement",
    href: "/dashboard/delivery",
    icon: Truck,
    roles: ["ADMIN"],
  },
  {
    name: "activities",
    href: "/dashboard/activities",
    icon: Activity,
    roles: ["ADMIN", "STAFF"],
  },
  {
    name: "settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN", "STAFF"],
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [analyticsOpen, setAnalyticsOpen] = useState(pathname.startsWith("/dashboard/analytics"))
  const [isCollapsed, setIsCollapsed] = useState(false)

  const hasAccess = (roles: string[]) => {
    return user && roles.includes(user.role)
  }

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CRM System
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mx-auto">
            <Package className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => {
            if (!hasAccess(item.roles)) return null

            if (item.children) {
              return (
                <Collapsible key={item.name} open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 rounded-xl px-3 py-3 text-slate-300 transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:shadow-lg group",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <div className="flex h-5 w-5 items-center justify-center">
                        <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="font-medium">{t(item.name as any)}</span>
                          <div className="ml-auto">
                            {analyticsOpen ? (
                              <ChevronDown className="h-4 w-4 transition-transform" />
                            ) : (
                              <ChevronRight className="h-4 w-4 transition-transform" />
                            )}
                          </div>
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent className="space-y-1 pl-3">
                      {item.children.map((child) => {
                        if (!hasAccess(child.roles)) return null

                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:bg-slate-700/30 hover:text-white group",
                              pathname === child.href &&
                                "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg border-l-2 border-blue-400",
                            )}
                          >
                            <div className="flex h-4 w-4 items-center justify-center ml-6">
                              <child.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                            </div>
                            <span className="font-medium">{t(child.name as any)}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-slate-300 transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:shadow-lg group",
                  pathname === item.href &&
                    "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg border-l-2 border-blue-400",
                  collapsed && "justify-center px-2",
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                </div>
                {!collapsed && <span className="font-medium">{t(item.name as any)}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer with collapse toggle */}
      <div className="border-t border-slate-700/50 p-3">
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full justify-start gap-3 rounded-xl px-3 py-3 text-slate-300 transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:shadow-lg group",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center">
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 transition-transform group-hover:scale-110" />
            ) : (
              <PanelLeftClose className="h-5 w-5 transition-transform group-hover:scale-110" />
            )}
          </div>
          {!collapsed && <span className="font-medium">Collapse</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden border-r border-slate-200 dark:border-slate-700 md:block transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          className,
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden bg-transparent border-slate-300 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
