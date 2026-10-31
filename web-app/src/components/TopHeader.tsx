"use client"

import * as React from "react"
import { Bell, LogOut, Loader2, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useRealtimeNotifications } from "@/hooks/use-realtime"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClientSwitcher } from "@/components/ClientSwitcher"
import { createClient } from "@/lib/supabase/client"

interface TopHeaderProps {
  clients: any[]
  activeClientId: string | null
}

export function TopHeader({ clients, activeClientId }: TopHeaderProps) {
  const { unreadCount } = useRealtimeNotifications()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = React.useState(false)
  const [userRole, setUserRole] = React.useState<string>("ADMIN")
  const [userName, setUserName] = React.useState<string>("Admin")

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const role = (user.user_metadata?.role as string) || "ADMIN"
        setUserRole(role)
        const name = user.user_metadata?.full_name || 
          (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim() : null) ||
          user.user_metadata?.phone || 
          user.email?.split("@")[0] || 
          "Admin User"
        setUserName(name)
      }
    }
    loadUser()
  }, [supabase])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (err) {
      console.error("Logout error:", err)
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-2xs">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground hover:bg-muted" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Admin Console</span>
      </div>
      
      <div className="flex flex-1 items-center justify-center">
        <ClientSwitcher clients={clients} activeClientId={activeClientId} />
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative hover:bg-muted text-muted-foreground hover:text-foreground">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive"></span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
        
        <Link
          href="/settings/profile"
          id="account-information-btn"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/60 hover:border-primary/50 hover:shadow-2xs transition-all cursor-pointer group"
          title="Account Information - Edit Profile & Password"
        >
          <Avatar className="size-8 border border-border group-hover:border-primary/40">
            <AvatarFallback className="bg-primary/15 text-primary font-black text-xs">
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start leading-none gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{userName}</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground border border-border/80">{userRole}</Badge>
            </div>
            <span className="text-[11px] font-medium text-primary flex items-center gap-1 group-hover:underline">
              <UserCog className="size-3" />
              Account Information
            </span>
          </div>
        </Link>

        <Separator orientation="vertical" className="h-5" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-slate-200 transition-colors flex items-center gap-1.5"
          title="Logout"
        >
          {loggingOut ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
          <span>Logout</span>
        </Button>
      </div>
    </header>
  )
}
