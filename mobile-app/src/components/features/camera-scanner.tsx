"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, Zap, ZapOff, RefreshCw, AlertCircle } from "lucide-react";
import { feedback } from "@/lib/feedback";

interface CameraBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  autoCloseOnScan?: boolean;
  cooldownMs?: number;
}

export function CameraBarcodeScanner({
  onScan,
  onClose,
  autoCloseOnScan = true,
  cooldownMs = 1200,
}: CameraBarcodeScannerProps) {
  const [scannerId] = useState(() => `reader-${Math.random().toString(36).substring(2, 9)}`);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      }
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async (facing: "environment" | "user") => {
    setErrorMessage(null);
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await stopScanner();
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ];

      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facing },
        config,
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanTimeRef.current < cooldownMs) {
            return; // Cooldown to avoid duplicate reads in 1 second
          }
          lastScanTimeRef.current = now;

          // Sound & Haptic Feedback
          feedback.normal();

          onScan(decodedText);

          if (autoCloseOnScan) {
            stopScanner().then(() => {
              if (onClose) onClose();
            });
          }
        },
        () => {
          // ignore frame decode misses
        }
      );

      setIsScanning(true);

      // Check if Torch/Flashlight is supported
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && "torch" in capabilities) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.error("Camera startup error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
        setErrorMessage("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
        setErrorMessage("No camera found on this device.");
      } else {
        setErrorMessage(`Failed to start camera: ${msg}`);
      }
      setIsScanning(false);
    }
  }, [scannerId, cooldownMs, onScan, autoCloseOnScan, onClose, stopScanner]);

  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        startScanner(facingMode);
      }
    };
    init();

    return () => {
      isCancelled = true;
      // Clean up camera on unmount
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
            html5QrCodeRef.current?.clear();
          });
        }
      }
    };
  }, [startScanner, facingMode]);

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch toggle error:", err);
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
  };

  const handleClose = async () => {
    await stopScanner();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 text-white z-20">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm tracking-tight">Camera Barcode / QR Scanner</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-2 rounded-full border transition-colors ${
                torchOn
                  ? "bg-amber-500 text-zinc-950 border-amber-400"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleFlipCamera}
            className="p-2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
            title="Flip Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              title="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* HTML5 QR Code Mount Element */}
        <div
          id={scannerId}
          className="w-full max-w-md h-full flex items-center justify-center [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
        />

        {/* Reticle / Viewfinder Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Dark Mask with Clear Box */}
            <div className="relative w-[260px] h-[260px] rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981] animate-[scanLaser_2s_ease-in-out_infinite]" />
            </div>

            <p className="text-zinc-300 text-xs font-semibold mt-4 bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-zinc-700">
              Align QR Code or Barcode inside the box
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {errorMessage && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-zinc-950/95 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="font-bold text-base text-zinc-100 mb-1">Camera Error</h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-5">{errorMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={() => startScanner(facingMode)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-colors"
              >
                Retry Camera
              </button>
              {onClose && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-300 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center text-xs text-zinc-400">
        <span>Supports 2D QR Codes, Code 128 (Location), UPC/EAN (Item), and Box Barcodes</span>
      </div>

      {/* CSS Animation for Laser Line */}
      <style jsx global>{`
        @keyframes scanLaser {
          0% {
            transform: translateY(-110px);
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(110px);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
