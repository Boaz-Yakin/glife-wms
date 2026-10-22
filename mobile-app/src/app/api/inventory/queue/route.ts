import { NextRequest, NextResponse } from 'next/server';
import { getPendingCycleCountQueue } from '@/services/inventory.service';
import { INSPECTOR_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireWorker(INSPECTOR_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    
    const queue = await getPendingCycleCountQueue(supabase, status);
    
    return NextResponse.json({ success: true, queue });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/inventory/queue error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch cycle count queue' },
      { status: 500 }
    );
  }
}
