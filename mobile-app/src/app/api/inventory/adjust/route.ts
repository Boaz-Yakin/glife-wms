import { NextResponse } from 'next/server';
import { adjustInventoryStock } from '@/services/inventory.service';
import { INSPECTOR_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    // TRD-002: INSPECTOR/ADMIN only; inspector id comes from the session, never the body.
    const { userId, supabase } = await requireWorker(INSPECTOR_ROLES);

    const body = await request.json();
    const { inventoryId, newQty, reason, requestId } = body;

    if (!inventoryId || newQty === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: inventoryId, newQty' },
        { status: 400 }
      );
    }

    if (newQty < 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory quantity cannot be negative.' },
        { status: 400 }
      );
    }

    // Call the service layer which invokes the PostgreSQL RPC (Single Transaction)
    await adjustInventoryStock(supabase, inventoryId, newQty, userId, reason || 'COUNT_MISMATCH', requestId);

    return NextResponse.json({ success: true, adjustedQty: newQty }, { status: 200 });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API Error /api/inventory/adjust:', error);
    
    // Handle Supabase constraint violations or custom RPC errors
    const errCode = (error as { code?: string })?.code;
    const errMsg = (error instanceof Error ? error.message : String(error));
    
    if (errCode === 'P0001') {
      return NextResponse.json(
        { success: false, error: errMsg || 'Cannot reduce stock below allocated quantity.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error during inventory adjustment.' },
      { status: 500 }
    );
  }
}
