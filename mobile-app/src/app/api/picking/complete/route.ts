import { NextRequest, NextResponse } from 'next/server';
import { completeOrderPicking } from '@/services/picking.service';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, supabase } = await requireWorker(PICKER_ROLES);

    const body = await request.json();
    const { orderId, targetStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    const result = await completeOrderPicking(
      supabase,
      orderId,
      userId,
      targetStatus === 'SHIPPED' ? 'SHIPPED' : 'PACKED'
    );

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/complete error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          (error instanceof Error ? error.message : String(error)) ||
          'Failed to complete order picking',
      },
      { status: 500 }
    );
  }
}
