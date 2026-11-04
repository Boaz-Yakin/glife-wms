import { Suspense } from "react";
import PutAwayClient from "./PutAwayClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PutAwayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#090A0F] text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-emerald-500" />
          Loading Put-away...
        </div>
      }
    >
      <PutAwayClient />
    </Suspense>
  );
}
