"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";

type QueueType = "URGENT" | "NORMAL";

interface CycleCountRequest {
  id: string;
  location_id: string;
  item_id: string;
  priority: QueueType;
  status: string;
  created_at: string;
  locations?: { code: string };
  items?: { sku: string; name: string };
}

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState<QueueType>("URGENT");
  const [queue, setQueue] = useState<CycleCountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory/queue');
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue);
      }
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const urgentQueue = queue.filter(q => q.priority === 'URGENT');
  const normalQueue = queue.filter(q => q.priority === 'NORMAL');

  const displayedQueue = activeTab === "URGENT" ? urgentQueue : normalQueue;

  return (
    <div className="flex flex-col h-full">
      {/* Top Fixed Tabs */}
      <div className="flex w-full border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <button 
          onClick={() => setActiveTab("URGENT")}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "URGENT" 
              ? "border-rose-500 text-rose-500 bg-rose-500/5" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          URGENT
          <Badge variant="destructive" className="ml-1 h-5 px-1.5 bg-rose-600 text-[10px]">
            {urgentQueue.length}
          </Badge>
        </button>
        <button 
          onClick={() => setActiveTab("NORMAL")}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "NORMAL" 
              ? "border-emerald-500 text-emerald-500 bg-emerald-500/5" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          NORMAL
          <Badge variant="outline" className="ml-1 h-5 px-1.5 border-zinc-700 text-[10px]">
            {normalQueue.length}
          </Badge>
        </button>
        <button 
          onClick={fetchQueue}
          className="px-4 border-b-2 border-transparent text-zinc-500 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List Area */}
      <div className="p-4 space-y-3 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-zinc-500 py-8">Loading queue...</div>
        ) : displayedQueue.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">No pending items.</div>
        ) : (
          displayedQueue.map(item => (
            <QueueItem 
              key={item.id}
              id={item.id}
              locationId={item.location_id}
              itemId={item.item_id}
              status={item.priority} 
              location={item.locations?.code || item.location_id} 
              sku={item.items?.sku || 'Unknown'} 
              itemName={item.items?.name || 'Unknown'} 
              requestedAt={new Date(item.created_at).toLocaleString()} 
              reason={item.priority === 'URGENT' ? "Picking Skip" : "Regular Cycle Count"} 
            />
          ))
        )}
      </div>
    </div>
  );
}

// Queue Item Component
function QueueItem({ 
  id, locationId, itemId, status, location, sku, itemName, requestedAt, reason 
}: { 
  id: string; locationId: string; itemId: string; status: QueueType; location: string; sku: string; itemName: string; requestedAt: string; reason: string 
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="font-bold text-lg text-white">{location}</div>
          <span className="text-xs text-zinc-500">{requestedAt}</span>
        </div>
        <div className="text-sm font-medium text-zinc-200 mb-1">{itemName}</div>
        <div className="text-xs text-zinc-400 mb-3">UPC/SKU: {sku}</div>
        <div className="flex justify-between items-center mt-2 pt-3 border-t border-zinc-800">
          <span className={`text-xs font-medium ${status === 'URGENT' ? 'text-rose-400' : 'text-zinc-400'}`}>
            Reason: {reason}
          </span>
          <Link 
            href={`/inventory/count?reqId=${id}&locId=${locationId}&itemId=${itemId}`} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded"
          >
            Start Count
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
