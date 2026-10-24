import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('web-app/.env.local', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: invData, error: invErr } = await supabase.from('inventory').select('*').limit(1);
  if (invErr) console.error('invErr:', invErr);
  else console.log('inventory columns:', Object.keys(invData[0] || {}));

  const { data: itemData, error: itemErr } = await supabase.from('items').select('*').limit(1);
  if (itemErr) console.error('itemErr:', itemErr);
  else console.log('items columns:', Object.keys(itemData[0] || {}));
}

check();
