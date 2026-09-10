import { NextRequest, NextResponse } from 'next/server';
import { getAllocatedOrders } from '@/services/picking.service';

export async function GET(request: NextRequest) {
  try {
    const orders = await getAllocatedOrders();
    
    return NextResponse.json({ success: true, orders });
  } catch (error: unknown) {
    console.error('API /api/picking/orders error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch allocated orders' },
      { status: 500 }
    );
  }
}


