import React from 'react';
import type { Metadata } from 'next';
import { 
  getWarehousePalletSummary, 
  getPalletList, 
  getPalletStorageStats 
} from '@/services/pallet-storage.service';
import { PalletStorageClient } from '@/components/features/inventory/PalletStorageClient';

export const metadata: Metadata = {
  title: 'CJ Pallet Storage & 3PL Billing | WMS',
  description: 'Real-time 768 warehouse slot visualization and automated 3PL storage fee calculation.',
};

export const dynamic = 'force-dynamic';

export default async function CJPalletStoragePage() {
  const [summaryRes, palletRes, stats] = await Promise.all([
    getWarehousePalletSummary(),
    getPalletList({ limit: 100 }),
    getPalletStorageStats(0.85),
  ]);

  return (
    <PalletStorageClient
      initialSlots={summaryRes.data}
      initialPallets={palletRes.data}
      totalPalletCount={palletRes.totalCount}
      initialStats={stats}
    />
  );
}
