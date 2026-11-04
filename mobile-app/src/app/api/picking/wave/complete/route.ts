import { NextRequest, NextResponse } from 'next/server';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireWorker(PICKER_ROLES);
    const body = await request.json();
    const { waveId } = body;

    if (!waveId) {
      return NextResponse.json(
        { success: false, message: 'Missing waveId parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase as any).rpc('complete_picking_wave', {
      p_wave_id: waveId,
    });

    if (error) {
      console.error('complete_picking_wave RPC error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/wave/complete error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to complete wave' },
      { status: 500 }
    );
  }
}
