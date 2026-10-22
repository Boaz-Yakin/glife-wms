import { NextResponse } from 'next/server';
import { getAllocatedOrders } from '@/services/picking.service';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function GET() {
  try {
    const { supabase } = await requireWorker(PICKER_ROLES);

    const orders = await getAllocatedOrders(supabase);
    
    return NextResponse.json({ success: true, orders });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/orders error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch allocated orders' },
      { status: 500 }
    );
  }
}
