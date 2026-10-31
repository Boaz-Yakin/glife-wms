"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, PackageSearch, ClipboardList, Database, Settings, LogOut, Package2, UserCog, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "cn"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // State for collapsible menus
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => ({
    "Inventory": pathname.startsWith("/inventory"),
    "Master Data": pathname.startsWith("/master"),
    "Settings": pathname.startsWith("/settings"),
  }))

  // Auto-sync active section on route change:
  // Automatically expands the active section and collapses inactive sections
  React.useEffect(() => {
    setOpenGroups({
      "Inventory": pathname.startsWith("/inventory"),
      "Master Data": pathname.startsWith("/master"),
      "Settings": pathname.startsWith("/settings"),
    })
  }, [pathname])

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: PackageSearch,
      items: [
        { title: "Stock Overview", url: "/inventory" },
        { title: "Reports & Analytics", url: "/inventory/reports" },
        { title: "Audit History", url: "/inventory/audit" },
      ]
    },
    {
      title: "Orders",
      url: "/orders",
      icon: ClipboardList,
    },
    {
      title: "Master Data",
      url: "/master",
      icon: Database,
      items: [
        { title: "Clients (3PL)", url: "/master/clients" },
        { title: "Items (SKU)", url: "/master/items" },
        { title: "Stores", url: "/master/stores" },
        { title: "Locations", url: "/master/locations" },
        { title: "Labels", url: "/master/labels" },
        { title: "Partners", url: "/master/partners" },
      ]
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        { title: "Account Information", url: "/settings/profile" },
        { title: "Security & Google OTP", url: "/settings/security" },
        { title: "Users", url: "/settings/users" },
        { title: "Notifications (카카오톡)", url: "/settings/notifications" },
      ]
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-sidebar-border/60 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />} className="hover:bg-sidebar-accent transition-colors">
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-black shadow-xs">
                <Package2 className="size-4.5" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold tracking-tight text-white">Glife WMS</span>
                <span className="text-[11px] font-medium text-sidebar-foreground/60">Logistics B2B Portal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu className="px-2 mt-3 space-y-1">
          {navItems.map((item) => {
            const hasSubItems = !!item.items
            const isOpen = openGroups[item.title] ?? false
            const isParentActive = item.items
              ? item.items.some((sub) => pathname === sub.url)
              : pathname.startsWith(item.url)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  onClick={hasSubItems ? () => toggleGroup(item.title) : undefined}
                  render={!hasSubItems ? <Link href={item.url} /> : undefined}
                  isActive={!hasSubItems && isParentActive} 
                  tooltip={item.title}
                  className={cn(
                    "cursor-pointer select-none transition-colors hover:bg-sidebar-accent hover:text-white",
                    !hasSubItems && isParentActive && "bg-sidebar-accent text-sidebar-primary font-semibold border-l-3 border-sidebar-primary rounded-l-none pl-2"
                  )}
                >
                  {!hasSubItems ? (
                    <>
                      <item.icon className={cn("size-4", isParentActive ? "text-sidebar-primary" : "text-sidebar-foreground/80")} />
                      <span className={isParentActive ? "text-sidebar-primary font-semibold" : "text-sidebar-foreground/90"}>{item.title}</span>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <item.icon className={cn("size-4 mr-2", isParentActive ? "text-sidebar-primary" : "text-sidebar-foreground/80")} />
                        <span className={cn(isParentActive ? "font-semibold text-white" : "font-medium text-sidebar-foreground/90")}>{item.title}</span>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "size-4 text-sidebar-foreground/50 transition-transform duration-200",
                          isOpen ? "rotate-180" : "rotate-0"
                        )} 
                      />
                    </div>
                  )}
                </SidebarMenuButton>
                {hasSubItems && isOpen && (
                  <SidebarMenuSub className="transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1 border-l border-sidebar-border ml-3 pl-2.5 my-1 space-y-0.5">
                    {item.items.map((subItem) => {
                      const isSubActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            render={<Link href={subItem.url} />}
                            isActive={isSubActive}
                            className={cn(
                              "text-xs transition-colors rounded-sm hover:bg-sidebar-accent hover:text-white",
                              isSubActive 
                                ? "text-sidebar-primary font-bold bg-sidebar-accent border-l-2 border-sidebar-primary -ml-[11px] pl-[9px] rounded-l-none" 
                                : "text-sidebar-foreground/75"
                            )}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              render={<Link href="/settings/profile" />}
              isActive={pathname === "/settings/profile"}
              className="text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent transition-colors"
            >
              <UserCog className="size-4" />
              <span>Account Information</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
