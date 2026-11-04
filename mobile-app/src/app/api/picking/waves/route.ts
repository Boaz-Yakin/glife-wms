import { NextResponse } from 'next/server';
import { getReleasedWaves } from '@/services/wave.service';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function GET() {
  try {
    const { supabase } = await requireWorker(PICKER_ROLES);

    const waves = await getReleasedWaves(supabase);

    return NextResponse.json({ success: true, waves });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/waves error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch waves' },
      { status: 500 }
    );
  }
}
