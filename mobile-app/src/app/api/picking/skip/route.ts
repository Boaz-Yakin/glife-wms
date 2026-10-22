import { NextRequest, NextResponse } from 'next/server';
import { reportPickingShortage } from '@/services/inventory.service';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Reporter id comes from the session (TRD-002 Q11).
    const { userId, supabase } = await requireWorker(PICKER_ROLES);

    const body = await request.json();
    const { locationId, itemId } = body;

    if (!locationId || !itemId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: locationId, itemId' },
        { status: 400 }
      );
    }

    const result = await reportPickingShortage(supabase, locationId, itemId, userId);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/skip error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to report picking shortage' },
      { status: 500 }
    );
  }
}
