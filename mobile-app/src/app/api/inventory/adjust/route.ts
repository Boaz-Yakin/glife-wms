import { NextResponse } from 'next/server';
import { adjustInventoryStock } from '@/services/inventory.service';

export async function POST(request: Request) {
  try {
    // In a real production app, we should verify the user's JWT token here.
    // e.g. const supabase = createRouteHandlerClient({ cookies });
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session || session.user.user_metadata.role !== 'INSPECTOR') throw Error...

    const body = await request.json();
    const { inventoryId, newQty, userId, reason, requestId } = body;

    if (!inventoryId || newQty === undefined || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: inventoryId, newQty, userId' },
        { status: 400 }
      );
    }

    if (newQty < 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory quantity cannot be negative.' },
        { status: 400 }
      );
    }

    // Call the service layer which invokes the PostgreSQL RPC (Single Transaction)
    await adjustInventoryStock(inventoryId, newQty, userId, reason || 'COUNT_MISMATCH', requestId);

    return NextResponse.json({ success: true, adjustedQty: newQty }, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error /api/inventory/adjust:', error);
    
    // Handle Supabase constraint violations or custom RPC errors
    const errCode = (error as { code?: string })?.code;
    const errMsg = (error instanceof Error ? error.message : String(error));
    
    if (errCode === 'P0001') {
      return NextResponse.json(
        { success: false, error: errMsg || 'Cannot reduce stock below allocated quantity.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error during inventory adjustment.' },
      { status: 500 }
    );
  }
}


