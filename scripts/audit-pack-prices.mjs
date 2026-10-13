// scripts/audit-pack-prices.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// .env.local 읽기
const envPath = path.resolve(process.cwd(), 'web-app/.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runAudit() {
  console.log('🔍 [WMS Master Data Audit] 상품 UOM 및 pack_price 현황 점검 시작...\n');

  // 1. 전체 상품 조회
  const { data: items, error } = await supabase
    .from('items')
    .select('id, sku, name_en, uom, unit_price, pack_price, box_price');

  if (error) {
    console.error('❌ 상품 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📦 총 등록 상품 수: ${items.length}개\n`);

  // UOM별 분포
  const uomStats = {};
  items.forEach(item => {
    const uom = (item.uom || 'UNKNOWN').toUpperCase();
    if (!uomStats[uom]) {
      uomStats[uom] = { count: 0, withPackPrice: 0, withBoxPrice: 0, withUnitPrice: 0 };
    }
    uomStats[uom].count++;
    if (Number(item.pack_price) > 0) uomStats[uom].withPackPrice++;
    if (Number(item.box_price) > 0) uomStats[uom].withBoxPrice++;
    if (Number(item.unit_price) > 0) uomStats[uom].withUnitPrice++;
  });

  console.log('📊 [UOM별 가격 통계]');
  console.table(uomStats);

  // UOM이 PACK인데 pack_price가 0이거나 null인 항목
  const missingPackPrice = items.filter(
    item => (item.uom || '').toUpperCase() === 'PACK' && (!item.pack_price || Number(item.pack_price) === 0)
  );

  console.log('\n⚠️ [주의 필요] UOM이 PACK이나 pack_price가 0 또는 미설정된 품목:');
  if (missingPackPrice.length === 0) {
    console.log('✅ 해당하는 품목이 없습니다. 모든 PACK 품목에 유효한 pack_price가 존재합니다.');
  } else {
    console.table(
      missingPackPrice.map(i => ({
        SKU: i.sku,
        Name: i.name_en,
        UOM: i.uom,
        unit_price: i.unit_price,
        pack_price: i.pack_price,
        box_price: i.box_price,
      }))
    );
  }
}

runAudit().catch(console.error);
