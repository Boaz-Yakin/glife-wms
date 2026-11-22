'use client';

import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Warehouse, 
  Calculator, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingUp,
  Filter
} from 'lucide-react';
import type { PalletSummarySlot, PalletItem, PalletStorageStats } from '@/services/pallet-storage.service';
import { formatDisplayLocation } from '@/lib/location';

interface PalletStorageClientProps {
  initialSlots: PalletSummarySlot[];
  initialPallets: PalletItem[];
  totalPalletCount: number;
  initialStats: PalletStorageStats;
}

export function PalletStorageClient({
  initialSlots,
  initialPallets,
  totalPalletCount,
  initialStats,
}: PalletStorageClientProps) {
  const [slots] = useState<PalletSummarySlot[]>(initialSlots);
  const [pallets] = useState<PalletItem[]>(initialPallets);
  const [activeTab, setActiveTab] = useState<'grid' | 'table'>('grid');

  // Filters
  const [selectedAisle, setSelectedAisle] = useState<number>(1); // 0 = all, 1 = default
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'FLOOR' | 'A' | 'B' | 'C'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'STORED' | 'EMPTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'corridor' | 'grid'>('corridor');

  // 3PL Billing rate simulation
  const [dailyRate, setDailyRate] = useState<number>(initialStats.dailyStorageRate || 0.85);

  // Selected slot detail modal
  const [selectedSlot, setSelectedSlot] = useState<PalletSummarySlot | null>(null);

  // Fast map lookup: "1-L-01-FLOOR" -> PalletSummarySlot
  const slotMap = useMemo(() => {
    const map = new Map<string, PalletSummarySlot>();
    for (const slot of slots) {
      map.set(slot.location_code, slot);
    }
    return map;
  }, [slots]);

  // Computed 3PL Billing
  const computedMonthlyBilling = useMemo(() => {
    return (initialStats.storedPalletCount * dailyRate * 30).toFixed(2);
  }, [initialStats.storedPalletCount, dailyRate]);

  // Filtered Slots for Grid
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const parts = slot.location_code.split('-');
      if (parts.length < 4) return false;
      const aisle = Number(parts[0]);
      const level = parts[3];

      if (selectedAisle !== 0 && aisle !== selectedAisle) return false;
      if (selectedLevel !== 'ALL' && level !== selectedLevel) return false;

      const isStored = slot.slot_status === '보관중' || slot.stored_pallet_count > 0;
      if (statusFilter === 'STORED' && !isStored) return false;
      if (statusFilter === 'EMPTY' && isStored) return false;

      if (searchQuery.trim()) {
        const sq = searchQuery.trim().toLowerCase();
        const codeMatch = slot.location_code.toLowerCase().includes(sq);
        const batchMatch = slot.batch_list?.toLowerCase().includes(sq);
        const palletMatch = slot.pallet_list?.toLowerCase().includes(sq);
        if (!codeMatch && !batchMatch && !palletMatch) return false;
      }

      return true;
    });
  }, [slots, selectedAisle, selectedLevel, statusFilter, searchQuery]);

  // Filtered Pallets for Table
  const filteredPallets = useMemo(() => {
    if (!searchQuery.trim()) return pallets;
    const sq = searchQuery.trim().toLowerCase();
    return pallets.filter(
      (p) =>
        p.batch_no.toLowerCase().includes(sq) ||
        p.pallet_no.toLowerCase().includes(sq) ||
        p.operator_name.toLowerCase().includes(sq) ||
        p.locations?.code.toLowerCase().includes(sq)
    );
  }, [pallets, searchQuery]);

  // Check if slot matches search query
  const isSearchMatch = (slot?: PalletSummarySlot) => {
    if (!slot || !searchQuery.trim()) return false;
    const term = searchQuery.trim().toLowerCase();
    const cleanTerm = term.replace(/[\s-]/g, '');
    return (
      slot.location_code.toLowerCase().includes(term) ||
      slot.location_code.toLowerCase().replace(/[\s-]/g, '').includes(cleanTerm) ||
      formatDisplayLocation(slot.location_code).toLowerCase().includes(term) ||
      formatDisplayLocation(slot.location_code).toLowerCase().replace(/[\s-]/g, '').includes(cleanTerm) ||
      (slot.batch_list?.toLowerCase().includes(term) ?? false) ||
      (slot.pallet_list?.toLowerCase().includes(term) ?? false)
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">CJ Pallet Storage & 3PL Billing</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              768 Warehouse Slots
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time warehouse rack occupancy and automated monthly 3PL storage fee calculation for CJ.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'grid'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🗺️ Rack Grid (768 Slots)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'table'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 Pallet List ({totalPalletCount})
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Slots */}
        <div className="bg-card border rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Slots</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{initialStats.totalSlots}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Aisle 1~3 (L/R)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Warehouse className="w-5 h-5" />
          </div>
        </div>

        {/* Stored Pallets */}
        <div className="bg-card border rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Stored Pallets</p>
            <h3 className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
              {initialStats.storedPalletCount}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Occupied Slots: {initialStats.occupiedSlots}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Vacant Slots */}
        <div className="bg-card border rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Vacant Slots</p>
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {initialStats.emptySlots}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Available for Put-away</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-card border rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Occupancy Rate</p>
            <h3 className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
              {initialStats.occupancyRate}%
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Warehouse Capacity</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* 3PL Storage Billing */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span>3PL Monthly Est.</span>
              <Calculator className="w-3.5 h-3.5" />
            </p>
            <h3 className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
              ${computedMonthlyBilling}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-muted-foreground">Rate: $</span>
              <input
                type="number"
                step="0.05"
                value={dailyRate}
                onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                className="w-12 text-[10px] font-bold px-1 py-0.5 bg-background border rounded text-foreground"
              />
              <span className="text-[10px] text-muted-foreground">/plt/day</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Aisle Selection */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            <span className="text-xs font-semibold px-2 text-muted-foreground">Aisle:</span>
            {[1, 2, 3, 0].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setSelectedAisle(a)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedAisle === a
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {a === 0 ? 'All' : `Aisle ${a}`}
              </button>
            ))}
          </div>

          {/* Level Selection */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            <span className="text-xs font-semibold px-2 text-muted-foreground">Level:</span>
            {(['ALL', 'FLOOR', 'A', 'B', 'C'] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setSelectedLevel(lv)}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedLevel === lv
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lv === 'ALL' ? 'All' : lv === 'FLOOR' ? 'FL' : `${lv}F`}
              </button>
            ))}
          </div>

          {/* Status Selection */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            {(['ALL', 'STORED', 'EMPTY'] as const).map((st) => {
              const isActive = statusFilter === st;
              const label = st === 'ALL' ? 'All Slots' : st === 'STORED' ? 'Occupied' : 'Vacant';
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? st === 'STORED'
                        ? 'bg-[#173452] text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                        : st === 'EMPTY'
                        ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950'
                        : 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('corridor')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'corridor'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ↔️ Facing L/R
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ▦ Grid
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Batch #, Pallet #, Location..."
            className="w-full text-xs py-2 pl-9 pr-3 bg-muted/50 border rounded-xl focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* VIEW 1: Interactive 768-Slot Rack Grid */}
      {activeTab === 'grid' && (
        <div className="bg-card border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filteredSlots.length}</strong> of 768 warehouse slots
              {statusFilter !== 'ALL' && (
                <span className="ml-1 font-semibold text-primary">
                  ({statusFilter === 'STORED' ? 'Occupied only' : 'Vacant only'})
                </span>
              )}
              {viewMode === 'corridor' && ' (Facing Layout: Left Rack ↔ Central Aisle ↔ Right Rack)'}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-900 dark:bg-slate-100"></span>
                <span>Occupied (CJ Pallet)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800 border"></span>
                <span>Vacant Slot</span>
              </span>
            </div>
          </div>

          {viewMode === 'corridor' ? (
            /* FACING CORRIDOR VIEW (L on Left, BIN in Middle, R on Right) */
            <div
              className={`gap-4 max-h-[720px] overflow-y-auto pr-1 items-start ${
                (selectedAisle === 0 ? [1, 2, 3] : [selectedAisle]).length === 1
                  ? 'flex justify-center'
                  : 'grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
              }`}
            >
              {(selectedAisle === 0 ? [1, 2, 3] : [selectedAisle]).map((aisle) => (
                <div key={aisle} className="bg-muted/30 border rounded-2xl p-3 shadow-2xs w-full max-w-[480px] mx-auto">
                  {/* Aisle & Rack Header */}
                  <div className="mb-2">
                    <div className="text-center pb-1 border-b mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs">
                        🏢 Aisle {aisle}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-xs font-bold text-foreground">
                      {/* Left L Rack Header: L 단독 중앙 표기 */}
                      <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg py-1 px-1.5 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                        <span className="font-black text-xs sm:text-sm tracking-widest">
                          L
                        </span>
                      </div>

                      {/* Center Empty Placeholder */}
                      <div className="w-11 shrink-0" />

                      {/* Right R Rack Header: R 단독 중앙 표기 */}
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 rounded-lg py-1 px-1.5 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        <span className="font-black text-xs sm:text-sm tracking-widest">
                          R
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 32 Bay Rows (위에서 아래로 32 -> 01 감소순 정렬) */}
                  <div className="space-y-1">
                    {Array.from({ length: 32 }, (_, i) => String(32 - i).padStart(2, '0')).map((bay) => {
                      const leftLevels: ('FLOOR' | 'A' | 'B' | 'C')[] =
                        selectedLevel === 'ALL' ? ['C', 'B', 'A', 'FLOOR'] : [selectedLevel];
                      const rightLevels: ('FLOOR' | 'A' | 'B' | 'C')[] =
                        selectedLevel === 'ALL' ? ['FLOOR', 'A', 'B', 'C'] : [selectedLevel];

                      return (
                        <div
                          key={bay}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 py-0.5 px-0.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {/* LEFT (L) SLOTS: C, B, A, FLOOR */}
                          <div
                            className={`grid gap-1 ${
                              leftLevels.length === 1
                                ? 'grid-cols-1'
                                : leftLevels.length === 2
                                ? 'grid-cols-2'
                                : leftLevels.length === 3
                                ? 'grid-cols-3'
                                : 'grid-cols-4'
                            }`}
                          >
                            {leftLevels.map((level) => {
                              const code = `${aisle}-L-${bay}-${level}`;
                              const slot = slotMap.get(code);
                              const isStored = slot && (slot.slot_status === '보관중' || slot.stored_pallet_count > 0);
                              const isMatch = isSearchMatch(slot);
                              const isFilteredOut = (statusFilter === 'STORED' && !isStored) || (statusFilter === 'EMPTY' && isStored);
                              const batchText = slot?.batch_list?.replace(/^#/, '') || '';
                              const rawPallet = slot?.pallet_list?.replace(/^P\.?/i, '') || '';
                              const palletText = rawPallet ? `#${rawPallet.slice(-4)}` : '';

                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => slot && setSelectedSlot(slot)}
                                  className={`h-[42px] p-1 rounded-md text-left transition-all relative overflow-hidden border flex flex-col justify-between min-w-0 ${
                                    isFilteredOut
                                      ? 'opacity-15 grayscale pointer-events-none border-dashed border-border/40 bg-muted/20'
                                      : isMatch
                                      ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-500 shadow-md animate-heartbeat'
                                      : isStored
                                      ? 'bg-[#173452] text-white border-[#173452] dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs hover:opacity-90'
                                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/40'
                                  }`}
                                >
                                  {/* 상단 행: 좌측 층수(FL, A, B, C) + 우측 차수(황색 뱃지) */}
                                  <div className="flex items-center justify-between w-full leading-none">
                                    <span
                                      className={`text-[10px] font-black font-mono leading-none shrink-0 ${
                                        isMatch
                                          ? 'text-red-600 font-black'
                                          : isStored
                                          ? 'text-blue-200 dark:text-blue-700'
                                          : 'text-muted-foreground/60'
                                      }`}
                                    >
                                      {level === 'FLOOR' ? 'FL' : level}
                                    </span>

                                    {isStored && batchText ? (
                                      <span className="text-[8.5px] sm:text-[9px] bg-amber-400 text-slate-950 font-black px-1 py-[1px] rounded-xs leading-none shadow-2xs text-center shrink-0">
                                        {batchText}
                                      </span>
                                    ) : null}
                                  </div>

                                  {/* 하단 행: 팔렛 번호 (#11) 중앙 배치 */}
                                  <div className="flex items-center justify-center w-full leading-none">
                                    {isStored ? (
                                      <span
                                        className={`text-[10px] sm:text-[10.5px] font-black font-mono tracking-tight leading-none ${
                                          isMatch ? 'text-slate-950' : 'text-white dark:text-slate-900'
                                        }`}
                                      >
                                        {palletText}
                                      </span>
                                    ) : (
                                      <span className={`text-[9.5px] font-normal leading-none ${isMatch ? 'text-slate-600' : 'text-muted-foreground/30'}`}>
                                        -
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* CENTER BIN COLUMN (BIN 32 ~ BIN 01) */}
                          <div className="w-11 h-[42px] rounded-md bg-amber-100/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex flex-col items-center justify-center text-amber-950 dark:text-amber-200 font-mono font-bold shadow-2xs">
                            <span className="text-[8px] text-amber-800 dark:text-amber-400 font-black tracking-wider leading-none">BIN</span>
                            <span className="text-[11px] text-amber-950 dark:text-amber-100 leading-tight font-black mt-0.5">{bay}</span>
                          </div>

                          {/* RIGHT (R) SLOTS: FLOOR, A, B, C */}
                          <div
                            className={`grid gap-1 ${
                              rightLevels.length === 1
                                ? 'grid-cols-1'
                                : rightLevels.length === 2
                                ? 'grid-cols-2'
                                : rightLevels.length === 3
                                ? 'grid-cols-3'
                                : 'grid-cols-4'
                            }`}
                          >
                            {rightLevels.map((level) => {
                              const code = `${aisle}-R-${bay}-${level}`;
                              const slot = slotMap.get(code);
                              const isStored = slot && (slot.slot_status === '보관중' || slot.stored_pallet_count > 0);
                              const isMatch = isSearchMatch(slot);
                              const isFilteredOut = (statusFilter === 'STORED' && !isStored) || (statusFilter === 'EMPTY' && isStored);
                              const batchText = slot?.batch_list?.replace(/^#/, '') || '';
                              const rawPallet = slot?.pallet_list?.replace(/^P\.?/i, '') || '';
                              const palletText = rawPallet ? `#${rawPallet.slice(-4)}` : '';

                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => slot && setSelectedSlot(slot)}
                                  className={`h-[42px] p-1 rounded-md text-left transition-all relative overflow-hidden border flex flex-col justify-between min-w-0 ${
                                    isFilteredOut
                                      ? 'opacity-15 grayscale pointer-events-none border-dashed border-border/40 bg-muted/20'
                                      : isMatch
                                      ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-500 shadow-md animate-heartbeat'
                                      : isStored
                                      ? 'bg-[#173452] text-white border-[#173452] dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs hover:opacity-90'
                                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/40'
                                  }`}
                                >
                                  {/* 상단 행: 좌측 층수(FL, A, B, C) + 우측 차수(황색 뱃지) */}
                                  <div className="flex items-center justify-between w-full leading-none">
                                    <span
                                      className={`text-[10px] font-black font-mono leading-none shrink-0 ${
                                        isMatch
                                          ? 'text-red-600 font-black'
                                          : isStored
                                          ? 'text-blue-200 dark:text-blue-700'
                                          : 'text-muted-foreground/60'
                                      }`}
                                    >
                                      {level === 'FLOOR' ? 'FL' : level}
                                    </span>

                                    {isStored && batchText ? (
                                      <span className="text-[8.5px] sm:text-[9px] bg-amber-400 text-slate-950 font-black px-1 py-[1px] rounded-xs leading-none shadow-2xs text-center shrink-0">
                                        {batchText}
                                      </span>
                                    ) : null}
                                  </div>

                                  {/* 하단 행: 팔렛 번호 (#11) 중앙 배치 */}
                                  <div className="flex items-center justify-center w-full leading-none">
                                    {isStored ? (
                                      <span
                                        className={`text-[10px] sm:text-[10.5px] font-black font-mono tracking-tight leading-none ${
                                          isMatch ? 'text-slate-950' : 'text-white dark:text-slate-900'
                                        }`}
                                      >
                                        {palletText}
                                      </span>
                                    ) : (
                                      <span className={`text-[9.5px] font-normal leading-none ${isMatch ? 'text-slate-600' : 'text-muted-foreground/30'}`}>
                                        -
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* FLAT GRID VIEW */
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5 max-h-[580px] overflow-y-auto p-1 bg-muted/30 border rounded-xl">
              {filteredSlots.map((slot) => {
                const isStored = slot.slot_status === '보관중' || slot.stored_pallet_count > 0;
                return (
                  <button
                    key={slot.location_id}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      isStored
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs hover:opacity-90'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold truncate">
                      {formatDisplayLocation(slot.location_code)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[9px]">
                      <span
                        className={`px-1 py-0.2 rounded font-bold ${
                          isStored
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isStored ? (slot.batch_list ? `#${slot.batch_list}` : 'CJ') : 'Empty'}
                      </span>
                      {isStored && slot.pallet_list && (
                        <span className="font-mono opacity-80">P.{slot.pallet_list.slice(0, 4)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Pallet Master Data Table */}
      {activeTab === 'table' && (
        <div className="bg-card border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                <tr>
                  <th className="py-3 px-4">CJ Batch #</th>
                  <th className="py-3 px-4">Pallet #</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPallets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No pallets found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPallets.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold">
                          {p.batch_no}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">#{p.pallet_no}</td>
                      <td className="py-3 px-4 font-mono font-medium">{p.locations?.code || '-'}</td>
                      <td className="py-3 px-4">{p.clients?.name || 'CJ'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{p.operator_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(p.updated_at).toLocaleString()}</td>
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]">{p.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slot Detail Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground w-full max-w-sm rounded-2xl p-5 shadow-2xl border animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Slot Info</span>
                <h3 className="text-lg font-black font-mono">
                  {formatDisplayLocation(selectedSlot.location_code)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs mb-5">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Status</span>
                <span className="font-bold text-primary">{selectedSlot.slot_status}</span>
              </div>
              {selectedSlot.batch_list && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">CJ Batch #</span>
                  <span className="font-mono font-bold">{selectedSlot.batch_list}</span>
                </div>
              )}
              {selectedSlot.pallet_list && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Pallet Numbers</span>
                  <span className="font-mono font-bold">{selectedSlot.pallet_list}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Pallet Count</span>
                <span className="font-bold">{selectedSlot.stored_pallet_count} Pallet(s)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
