import { NextRequest, NextResponse } from 'next/server';
import { getOrderPickingItems } from '@/services/picking.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId parameter' },
        { status: 400 }
      );
    }

    const items = await getOrderPickingItems(orderId);
    
    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('API /api/picking/run error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch picking items' },
      { status: 500 }
    );
  }
}


