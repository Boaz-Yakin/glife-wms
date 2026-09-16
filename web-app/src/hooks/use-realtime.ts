"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useRealtimeNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to cycle_count_requests INSERTs
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cycle_count_requests',
        },
        (payload: any) => {
          const newRequest = payload.new
          toast.error("Urgent Cycle Count Requested!", {
            description: `A cycle count was requested at location: ${newRequest.location_id || 'N/A'}.`,
            action: {
              label: "View",
              onClick: () => console.log("Navigate to audit")
            }
          })
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { unreadCount, setUnreadCount }
}
