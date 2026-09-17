"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import { useRealtimeNotifications } from "@/hooks/use-realtime"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClientSwitcher } from "@/components/ClientSwitcher"

interface TopHeaderProps {
  clients: any[]
  activeClientId: string | null
}

export function TopHeader({ clients, activeClientId }: TopHeaderProps) {
  const { unreadCount } = useRealtimeNotifications()

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-sm font-medium">Dashboard</h1>
      </div>
      
      <div className="flex flex-1 items-center justify-center">
        <ClientSwitcher clients={clients} activeClientId={activeClientId} />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive"></span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-1">
            <span className="text-sm font-medium leading-none">Admin User</span>
            <Badge variant="secondary" className="mt-1 h-4 px-1 text-[10px]">ADMIN</Badge>
          </div>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">AD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
