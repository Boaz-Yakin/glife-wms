import { NextRequest, NextResponse } from 'next/server';
import { getOrderPickingItems } from '@/services/picking.service';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireWorker(PICKER_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId parameter' },
        { status: 400 }
      );
    }

    const items = await getOrderPickingItems(supabase, orderId);
    
    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/run error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch picking items' },
      { status: 500 }
    );
  }
}
