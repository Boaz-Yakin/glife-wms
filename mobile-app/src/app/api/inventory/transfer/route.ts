import { NextRequest, NextResponse } from 'next/server';
import { INSPECTOR_ROLES, requireWorker } from '@/services/auth.service';
import { transferInventoryStock } from '@/services/inventory.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, supabase } = await requireWorker(INSPECTOR_ROLES);
    const body = await request.json();
    const { fromLocationId, toLocationId, itemId, qty } = body;

    if (!fromLocationId || !toLocationId || !itemId || !qty || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters: fromLocationId, toLocationId, itemId, qty' },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { success: false, error: 'Source and destination locations must be different.' },
        { status: 400 }
      );
    }

    const result = await transferInventoryStock(
      supabase,
      fromLocationId,
      toLocationId,
      itemId,
      Number(qty),
      userId
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/inventory/transfer error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg || 'Transfer failed.' }, { status: 500 });
  }
}
