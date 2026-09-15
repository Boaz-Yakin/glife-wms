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
          toast.error("긴급 실사 요청 접수!", {
            description: `로케이션: ${newRequest.location_id || 'N/A'}에서 실사가 요청되었습니다.`,
            action: {
              label: "확인",
              onClick: () => console.log("실사 내역 이동")
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
