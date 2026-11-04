import { NextRequest, NextResponse } from 'next/server';
import { PICKER_ROLES, requireWorker } from '@/services/auth.service';
import { authErrorResponse } from '@/lib/api-auth';
import { optimizePickingTour } from '@/lib/routing/tsp-picker';
import type { WaveConsolidatedPickItem } from '@/services/wave.service';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireWorker(PICKER_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const waveId = searchParams.get('waveId');

    if (!waveId) {
      return NextResponse.json(
        { success: false, message: 'Missing waveId parameter' },
        { status: 400 }
      );
    }

    // 1. 웨이브 기본 정보 및 토트 매핑 조회
    const { data: wave, error: waveErr } = await (supabase as any)
      .from('picking_waves')
      .select(`
        *,
        wave_orders:wave_orders (
          id,
          order_id,
          tote_no,
          tote_barcode,
          status,
          order:orders (
            id,
            order_no,
            store:stores (name)
          )
        )
      `)
      .eq('id', waveId)
      .single();

    if (waveErr || !wave) {
      return NextResponse.json(
        { success: false, message: waveErr?.message || 'Wave not found' },
        { status: 404 }
      );
    }

    const orderIds = (wave.wave_orders || []).map((wo: any) => wo.order_id);
    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, wave, items: [] });
    }

    // 2. 발주 품목 및 로케이션 정보 조회
    const { data: rawOrderItems, error: itemsErr } = await (supabase as any)
      .from('order_items')
      .select(`
        id,
        order_id,
        item_id,
        location_id,
        qty,
        uom,
        item:items (
          id,
          sku,
          name_en,
          upc
        ),
        location:locations (
          id,
          code,
          zone_type,
          pos_x,
          pos_y,
          rotation,
          temperature_zone
        )
      `)
      .in('order_id', orderIds);

    if (itemsErr) {
      return NextResponse.json(
        { success: false, message: itemsErr.message },
        { status: 500 }
      );
    }

    // 3. 토트 매핑 사전
    const toteMap = new Map<string, { tote_no: number; tote_barcode: string; store_name: string }>();
    for (const wo of wave.wave_orders || []) {
      toteMap.set(wo.order_id, {
        tote_no: wo.tote_no,
        tote_barcode: wo.tote_barcode,
        store_name: wo.order?.store?.name || `Order ${wo.order?.order_no || wo.order_id.slice(0, 8)}`,
      });
    }

    // 4. 품목/로케이션별 통합(Consolidation)
    const groupMap = new Map<string, WaveConsolidatedPickItem>();

    for (const oi of rawOrderItems || []) {
      const key = `${oi.item_id}_${oi.location_id || 'NO_LOC'}`;
      const toteInfo = toteMap.get(oi.order_id);

      if (!groupMap.has(key)) {
        const loc = oi.location;
        const locCode = loc?.code || 'UNASSIGNED';
        const match = locCode.match(/^LOC-([A-Z])(\d{2})(\d{2})([A-Z])(\d{2})$/i);

        groupMap.set(key, {
          id: `wave_pick_${key}`,
          item_id: oi.item_id,
          sku: oi.item?.sku || 'SKU-UNKNOWN',
          name: oi.item?.name_en || 'Unknown Item',
          upc: oi.item?.upc || '',
          uom: oi.uom || 'EA',
          total_qty: 0,
          status: 'PENDING',
          locations: {
            id: loc?.id || '',
            code: locCode,
            zone: match ? match[1].toUpperCase() : (loc?.zone_type || 'A'),
            aisle: match ? parseInt(match[2], 10) : 1,
            bay: match ? parseInt(match[3], 10) : 1,
            level: match ? match[4].toUpperCase() : 'A',
            bin: match ? parseInt(match[5], 10) : 1,
            pos_x: loc?.pos_x ?? 0,
            pos_y: loc?.pos_y ?? 0,
            rotation: loc?.rotation ?? 0,
            temperature_zone: loc?.temperature_zone || (loc?.zone_type === 'F' ? 'FROZEN' : 'ROOM'),
          },
          tote_distributions: [],
        });
      }

      const grouped = groupMap.get(key)!;
      const itemQty = Number(oi.qty || 0);
      grouped.total_qty += itemQty;

      if (toteInfo) {
        grouped.tote_distributions.push({
          tote_no: toteInfo.tote_no,
          tote_barcode: toteInfo.tote_barcode,
          order_id: oi.order_id,
          store_name: toteInfo.store_name,
          qty: itemQty,
        });
      }
    }

    const consolidatedList = Array.from(groupMap.values());
    const { sortedItems } = optimizePickingTour(consolidatedList);

    return NextResponse.json({
      success: true,
      wave,
      items: sortedItems,
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error('API /api/picking/wave error:', error);
    return NextResponse.json(
      { success: false, message: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch wave items' },
      { status: 500 }
    );
  }
}
