import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface UrgentQueueBannerProps {
  count: number;
}

export function UrgentQueueBanner({ count }: UrgentQueueBannerProps) {
  if (count === 0) return null;

  return (
    <Link href="/inventory/queue" className="block w-full">
      <div className="bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 flex items-center justify-between mb-4 shadow-sm shadow-rose-900/20 active:bg-rose-500/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/20 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-semibold text-rose-400 text-sm">Urgent Cycle Counts</h3>
            <p className="text-xs text-rose-300 opacity-80">Skipped during picking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-rose-500 text-white font-bold px-2.5 py-0.5 rounded-full text-sm">
            {count}
          </span>
          <span className="text-rose-400 text-xs font-medium">View {'>'}</span>
        </div>
      </div>
    </Link>
  );
}
