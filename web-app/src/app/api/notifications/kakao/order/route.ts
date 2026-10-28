import { NextRequest, NextResponse } from 'next/server'
import { sendKakaoOrderNotification } from '@/services/kakao.service'

export async function POST(req: NextRequest) {
  try {
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
