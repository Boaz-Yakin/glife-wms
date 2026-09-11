import { NextRequest, NextResponse } from 'next/server';
import { reportPickingShortage } from '@/services/inventory.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, itemId, userId } = body;

    if (!locationId || !itemId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: locationId, itemId, userId' },
        { status: 400 }
      );
    }

    const result = await reportPickingShortage(locationId, itemId, userId);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error('API /api/picking/skip error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to report picking shortage' },
      { status: 500 }
    );
  }
}


