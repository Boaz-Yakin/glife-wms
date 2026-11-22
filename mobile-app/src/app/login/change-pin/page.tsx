"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KeyRound, AlertCircle, CheckCircle2, Delete } from "lucide-react";

export default function ChangePinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [activeStep, setActiveStep] = useState<"new" | "confirm">("new");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (num: string) => {
    setError(null);
    if (activeStep === "new") {
      if (pin.length < 6) {
        const next = pin + num;
        setPin(next);
        if (next.length === 6) {
          setActiveStep("confirm");
        }
      }
    } else {
      if (confirmPin.length < 6) {
        setConfirmPin((prev) => prev + num);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (activeStep === "confirm") {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setActiveStep("new");
      }
    } else {
      if (pin.length > 0) {
        setPin((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleReset = () => {
    setPin("");
    setConfirmPin("");
    setActiveStep("new");
    setError(null);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6 || confirmPin.length !== 6) {
      setError("Please complete all 6 digits for both PINs.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match. Please try again.");
      handleReset();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update PIN.");
        return;
      }

      router.replace(data.redirectTo || "/inventory");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none">
      {/* Top Header */}
      <div className="pt-6 pb-2 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-lg shadow-amber-950/40">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Set New PIN</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Temporary PIN detected. Set your personal 6-digit PIN.
        </p>
      </div>

      {/* PIN Displays */}
      <div className="space-y-3">
        {/* Step 1: New PIN */}
        <div
          onClick={() => setActiveStep("new")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            activeStep === "new"
              ? "bg-zinc-900 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-zinc-950 border-zinc-800"
          }`}
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">1. New 6-Digit PIN</div>
            <div className="flex items-center gap-2 mt-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    idx < pin.length
                      ? "bg-amber-400 border-amber-400 scale-105"
                      : "bg-zinc-900 border-zinc-700"
                  }`}
                />
              ))}
            </div>
          </div>
          {pin.length === 6 && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
        </div>

        {/* Step 2: Confirm PIN */}
        <div
          onClick={() => {
            if (pin.length === 6) setActiveStep("confirm");
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            activeStep === "confirm"
              ? "bg-zinc-900 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-zinc-950 border-zinc-800 opacity-80"
          }`}
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">2. Confirm PIN</div>
            <div className="flex items-center gap-2 mt-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    idx < confirmPin.length
                      ? "bg-emerald-400 border-emerald-400 scale-105"
                      : "bg-zinc-900 border-zinc-700"
                  }`}
                />
              ))}
            </div>
          </div>
          {confirmPin.length === 6 && confirmPin === pin && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Large Touchpad */}
      <div className="grid grid-cols-3 gap-2 py-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-xl font-bold text-white border border-zinc-800 transition-transform active:scale-95 shadow-sm"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={handleReset}
          className="h-14 rounded-xl bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 text-xs font-bold text-zinc-400 border border-zinc-850 transition-transform active:scale-95"
        >
          RESET
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          className="h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-xl font-bold text-white border border-zinc-800 transition-transform active:scale-95 shadow-sm"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-14 rounded-xl bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-850 transition-transform active:scale-95"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Save Button */}
      <div className="pb-4">
        <Button
          onClick={handleSubmit}
          disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
          className="w-full h-14 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-base font-bold rounded-xl shadow-lg shadow-amber-950/40 transition-all active:scale-[0.98]"
        >
          {loading ? "Saving PIN..." : "SAVE NEW PIN"}
        </Button>
      </div>
    </div>
  );
}
