"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Phone, AlertCircle, ShieldAlert, CheckCircle2, Delete } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [activeField, setActiveField] = useState<"phone" | "pin">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 10);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 3)}) ${raw.slice(3)}`;
    return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
  };

  const handleKeyPress = (num: string) => {
    setError(null);
    if (activeField === "phone") {
      const raw = phone.replace(/\D/g, "");
      if (raw.length < 10) {
        const next = formatPhone(raw + num);
        setPhone(next);
        if (raw.length + 1 === 10) {
          setActiveField("pin");
        }
      }
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + num);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (activeField === "pin") {
      if (pin.length > 0) {
        setPin((prev) => prev.slice(0, -1));
      } else {
        setActiveField("phone");
      }
    } else {
      const raw = phone.replace(/\D/g, "");
      if (raw.length > 0) {
        setPhone(formatPhone(raw.slice(0, -1)));
      }
    }
  };

  const handleClear = () => {
    setError(null);
    if (activeField === "pin") {
      setPin("");
    } else {
      setPhone("");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      setActiveField("phone");
      return;
    }
    if (pin.length < 6) {
      setError("Please enter your 6-digit PIN.");
      setActiveField("pin");
      return;
    }

    setLoading(true);
    setError(null);
    setLockedUntil(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, secret: pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "LOCKED" && data.lockedUntil) {
          const lockTime = new Date(data.lockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLockedUntil(lockTime);
          setError(`Account locked until ${lockTime} due to repeated failed attempts.`);
        } else {
          setError(data.error || "Login failed. Check your phone number and PIN.");
        }
        setPin("");
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg shadow-emerald-950/40">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">WMS Mobile</h1>
        <p className="text-xs text-zinc-400 mt-1">Field Picker & Inspector Access</p>
      </div>

      {/* Inputs Display */}
      <div className="space-y-3">
        {/* Phone Field */}
        <div
          onClick={() => setActiveField("phone")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            activeField === "phone"
              ? "bg-zinc-900 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-zinc-950 border-zinc-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <Phone className={`w-5 h-5 ${activeField === "phone" ? "text-emerald-400" : "text-zinc-500"}`} />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Phone Number</div>
              <div className="text-lg font-mono font-bold tracking-wide">
                {phone || <span className="text-zinc-600 font-normal">Tap to enter phone</span>}
              </div>
            </div>
          </div>
          {phone && activeField === "phone" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-xs text-zinc-500 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* PIN Field */}
        <div
          onClick={() => setActiveField("pin")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            activeField === "pin"
              ? "bg-zinc-900 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-zinc-950 border-zinc-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <Lock className={`w-5 h-5 ${activeField === "pin" ? "text-emerald-400" : "text-zinc-500"}`} />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">6-Digit PIN</div>
              <div className="flex items-center gap-2 mt-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = idx < pin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border transition-all ${
                        filled
                          ? "bg-emerald-400 border-emerald-400 scale-105"
                          : "bg-zinc-900 border-zinc-700"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {pin.length === 6 && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {/* Error / Locked Banner */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Large Touchpad for Warehouse Gloves */}
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
          onClick={handleClear}
          className="h-14 rounded-xl bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 text-xs font-bold text-zinc-400 border border-zinc-850 transition-transform active:scale-95"
        >
          CLEAR
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

      {/* Submit Button */}
      <div className="pb-4">
        <Button
          onClick={() => handleSubmit()}
          disabled={loading || phone.replace(/\D/g, "").length < 10 || pin.length < 6}
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-base font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
        >
          {loading ? "Signing in..." : "SIGN IN"}
        </Button>
      </div>
    </div>
  );
}
