import { NextRequest, NextResponse } from 'next/server';
import { getPendingCycleCountQueue } from '@/services/inventory.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    
    const queue = await getPendingCycleCountQueue(status);
    
    return NextResponse.json({ success: true, queue });
  } catch (error: unknown) {
    console.error('API /api/inventory/queue error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch cycle count queue' },
      { status: 500 }
    );
  }
}


