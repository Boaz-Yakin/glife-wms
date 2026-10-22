import { NextRequest, NextResponse } from 'next/server';
import { INSPECTOR_ROLES, requireWorker } from '@/services/auth.service';
import { putAwayStock } from '@/services/inventory.service';
import { authErrorResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireWorker(INSPECTOR_ROLES);
    const body = await request.json();
    const { locationCode, itemCode, qty, reason } = body;

    if (!locationCode || !itemCode || !qty || Number(qty) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters: locationCode, itemCode, qty (must be > 0)' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const result = await putAwayStock(adminClient, {
      locationCodeOrId: locationCode,
      itemCodeOrId: itemCode,
      qty: Number(qty),
      operatorId: userId,
      reason,
    });

    return NextResponse.json({ success: true, inventory: result }, { status: 200 });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/inventory/put-away error:', error);
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error === 'string'
        ? error
        : JSON.stringify(error);

    return NextResponse.json({ success: false, error: msg || 'Put-away failed.' }, { status: 500 });
  }
}
