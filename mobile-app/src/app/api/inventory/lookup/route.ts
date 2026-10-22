import { NextRequest, NextResponse } from 'next/server';
import { INSPECTOR_ROLES, requireWorker } from '@/services/auth.service';
import { lookupByLocation, lookupByItem } from '@/services/inventory.service';
import { authErrorResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireWorker(INSPECTOR_ROLES);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code')?.trim();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code parameter is required.' }, { status: 400 });
    }

    // Check if code matches location format (e.g. LOC-A0105B01 or starts with LOC-)
    const isLocation = code.startsWith('LOC-') || /^[A-Z]\d{2}-\d{2}-[A-Z]\d{2}$/i.test(code);

    if (isLocation) {
      const locResult = await lookupByLocation(supabase, code);
      if (locResult) {
        return NextResponse.json({ success: true, type: 'LOCATION', data: locResult });
      }
    }

    // Try item lookup (or fallback to item if not found as location)
    const itemResult = await lookupByItem(supabase, code);
    if (itemResult) {
      return NextResponse.json({ success: true, type: 'ITEM', data: itemResult });
    }

    // If still not found and was not initially checked as location, try location as last resort
    if (!isLocation) {
      const locResult = await lookupByLocation(supabase, code);
      if (locResult) {
        return NextResponse.json({ success: true, type: 'LOCATION', data: locResult });
      }
    }

    return NextResponse.json({
      success: false,
      error: `No location or product found matching barcode "${code}" in warehouse.`,
    }, { status: 404 });

  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/inventory/lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up barcode in database.' },
      { status: 500 }
    );
  }
}
