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
    "Master Data": pathname.startsWith("/master"),
    "Settings": pathname.startsWith("/settings"),
  }))

  // Auto-sync active section on route change:
  // Automatically expands the active section and collapses inactive sections
  React.useEffect(() => {
    setOpenGroups({
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
      ]
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package2 className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Glife WMS</span>
                <span className="text-xs text-muted-foreground">Admin Portal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu className="px-2 mt-4">
          {navItems.map((item) => {
            const hasSubItems = !!item.items
            const isOpen = openGroups[item.title] ?? false
            const isParentActive = item.items
              ? item.items.some((sub) => pathname === sub.url)
              : pathname.startsWith(item.url)

            return (
              <SidebarMenuItem key={item.title} className="mt-1">
                <SidebarMenuButton 
                  onClick={hasSubItems ? () => toggleGroup(item.title) : undefined}
                  render={!hasSubItems ? <Link href={item.url} /> : undefined}
                  isActive={!hasSubItems && isParentActive} 
                  tooltip={item.title}
                  className="cursor-pointer select-none"
                >
                  {!hasSubItems ? (
                    <>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <item.icon className="size-4 mr-2" />
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          isOpen ? "rotate-180" : "rotate-0"
                        )} 
                      />
                    </div>
                  )}
                </SidebarMenuButton>
                {hasSubItems && isOpen && (
                  <SidebarMenuSub className="transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          render={<Link href={subItem.url} />}
                          isActive={pathname === subItem.url}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              render={<Link href="/settings/profile" />}
              isActive={pathname === "/settings/profile"}
              className="text-slate-700 hover:text-primary hover:bg-primary/5"
            >
              <UserCog className="size-4" />
              <span>Account Information</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
