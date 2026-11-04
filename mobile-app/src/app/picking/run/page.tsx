import { Suspense } from "react";
import PickingRunClient from "./PickingRunClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PickingRunPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full bg-black text-white items-center justify-center min-h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold">Loading...</h2>
        </div>
      }
    >
      <PickingRunClient />
    </Suspense>
  );
}
