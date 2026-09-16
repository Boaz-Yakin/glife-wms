"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, PackageSearch, ClipboardList, Database, Settings, LogOut, Package2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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
      isActive: true,
      items: [
        { title: "Items (SKU)", url: "/master/items" },
        { title: "Locations", url: "/master/locations" },
        { title: "Labels", url: "/master/labels" },
        { title: "Partners", url: "/master/partners" },
      ]
    },
    {
      title: "Settings",
      url: "/settings/users",
      icon: Settings,
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
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title} className="mt-1">
              <SidebarMenuButton 
                render={!item.items ? <Link href={item.url} /> : undefined}
                isActive={pathname.startsWith(item.url) && !item.items} 
                tooltip={item.title}
              >
                {!item.items ? (
                  <>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </>
                ) : (
                  <div className="flex items-center w-full">
                    <item.icon className="size-4 mr-2" />
                    <span className="font-semibold">{item.title}</span>
                  </div>
                )}
              </SidebarMenuButton>
              {item.items && (
                <SidebarMenuSub>
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
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
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
