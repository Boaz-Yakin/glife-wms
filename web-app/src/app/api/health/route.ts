import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface HealthCheckResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  service: string
  slaTarget: string
  version: string
  uptimeSeconds: number
  timestamp: string
  checks: {
    database: {
      status: 'UP' | 'DOWN'
      latencyMs: number
      error?: string
    }
    system: {
      memory: {
        heapUsedMB: number
        heapTotalMB: number
        rssMB: number
      }
      nodeVersion: string
      platform: string
    }
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  let dbStatus: 'UP' | 'DOWN' = 'DOWN'
  let dbLatency = 0
  let dbError: string | undefined

  try {
    const supabase = createAdminClient()
    const dbPingStart = Date.now()
    
    // Lightweight check query
    const { error } = await supabase.from('tenants').select('id').limit(1)
    dbLatency = Date.now() - dbPingStart

    if (error) {
      dbStatus = 'DOWN'
      dbError = error.message
    } else {
      dbStatus = 'UP'
    }
  } catch (err: any) {
    dbStatus = 'DOWN'
    dbError = err?.message || 'Database connection failure'
    dbLatency = Date.now() - startTime
  }

  const mem = process.memoryUsage()
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

  const isDegraded = dbLatency > 1500
  const isHealthy = dbStatus === 'UP' && !isDegraded

  const healthData: HealthCheckResponse = {
    status: isHealthy ? 'HEALTHY' : dbStatus === 'UP' ? 'DEGRADED' : 'UNHEALTHY',
    service: 'WMS-Enterprise-Core',
    slaTarget: '99.90%',
    version: '0.1.4',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        ...(dbError ? { error: dbError } : {}),
      },
      system: {
        memory: {
          heapUsedMB: toMB(mem.heapUsed),
          heapTotalMB: toMB(mem.heapTotal),
          rssMB: toMB(mem.rss),
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    },
  }

  const httpStatus = healthData.status === 'UNHEALTHY' ? 503 : 200

  return Response.json(healthData, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-SLA-Status': healthData.status,
      'X-Response-Time-Ms': (Date.now() - startTime).toString(),
    },
  })
}
