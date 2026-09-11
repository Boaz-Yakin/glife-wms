import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UrgentQueueBanner } from "@/components/features/inventory/urgent-queue-banner";

export default function InventoryHomePage() {
  // TODO: Fetch from actual DB in Server Component
  const urgentCount = 3;
  const normalCount = 12;

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Urgent Queue Banner */}
      <UrgentQueueBanner count={urgentCount} />

      {/* Today's Cycle Count Summary */}
      <h2 className="text-lg font-bold mb-2">Today's Summary</h2>
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Completed</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-emerald-400">45<span className="text-sm font-normal text-zinc-500 ml-1">items</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-zinc-200">{normalCount}<span className="text-sm font-normal text-zinc-500 ml-1">items</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
        <p className="mb-2">💡 <strong>Guidelines</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Please prioritize <strong className="text-rose-400">Urgent</strong> cycle counts (picking skips).</li>
          <li>Use the <strong className="text-zinc-200">🔍 Lookup</strong> tab to scan and check locations.</li>
        </ul>
      </div>
    </div>
  );
}
