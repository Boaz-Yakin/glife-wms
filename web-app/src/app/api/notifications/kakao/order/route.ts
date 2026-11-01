import { NextRequest, NextResponse } from 'next/server'
import { sendKakaoOrderNotification } from '@/services/kakao.service'
import { createClient } from '@/lib/supabase/server'
import { verifyInternalSecret } from '@/lib/auth/guard'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization: Internal secret token or valid user session
    const secretHeader = req.headers.get('x-internal-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const isSecretValid = verifyInternalSecret(secretHeader)

    if (!isSecretValid) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing or invalid authentication token.' },
          { status: 401 }
        )
      }
    }

    const body = await req.json().catch(() => ({}))
    const orderId = body.order_id || body.orderId

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: order_id' },
        { status: 400 }
      )
    }

    const result = await sendKakaoOrderNotification(orderId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || result.error || 'Failed to send Kakao notification',
        },
        { status: 200 } // Keep 200 so callers know it's not a server crash, but notification was disabled or failed
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Kakao notification sent successfully.',
      resultCode: result.resultCode,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('Error in /api/notifications/kakao/order:', err)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
