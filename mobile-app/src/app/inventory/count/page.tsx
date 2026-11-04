import { Suspense } from "react";
import CountClient from "./CountClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Loading audit interface...</p>
        </div>
      }
    >
      <CountClient />
    </Suspense>
  );
}
