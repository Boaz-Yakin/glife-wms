"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, Zap, ZapOff, RefreshCw, AlertCircle, CheckCircle2, ScanLine, MapPin, Package } from "lucide-react";
import { feedback } from "@/lib/feedback";

interface CameraBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  autoCloseOnScan?: boolean;
  cooldownMs?: number;
  confirmationDelayMs?: number;
  title?: string;
}

export function CameraBarcodeScanner({
  onScan,
  onClose,
  autoCloseOnScan = true,
  cooldownMs = 1200,
  confirmationDelayMs = 650,
  title = "Barcode / QR Scanner",
}: CameraBarcodeScannerProps) {
  const [scannerId] = useState(() => `reader-${Math.random().toString(36).substring(2, 9)}`);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Detection / Lock-on State
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [confirmProgress, setConfirmProgress] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanner = useCallback(async () => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
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

  const handleDetected = useCallback(
    (code: string) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < cooldownMs) return;
      if (isDetectingRef.current) return;

      isDetectingRef.current = true;
      lastScanTimeRef.current = now;
      setDetectedCode(code);

      // Sound & Haptic Feedback immediately upon lock-on
      if (code.startsWith("LOC-") || code.includes("-")) {
        feedback.match();
      } else {
        feedback.normal();
      }

      // Try pausing camera frame so worker sees the frozen captured barcode
      try {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.pause(true);
        }
      } catch {
        // Safe fallback if pause is unsupported
      }

      // Start visual progress bar animation
      requestAnimationFrame(() => {
        setConfirmProgress(true);
      });

      // Confirmation Hold Delay (650ms default): gives the worker clear, unmistakable confirmation
      confirmTimerRef.current = setTimeout(async () => {
        onScan(code);

        if (autoCloseOnScan) {
          await stopScanner();
          if (onClose) onClose();
        } else {
          // If not auto-closing, reset after delay
          setDetectedCode(null);
          setConfirmProgress(false);
          isDetectingRef.current = false;
          try {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
              html5QrCodeRef.current.resume();
            }
          } catch {
            // Safe fallback
          }
        }
      }, confirmationDelayMs);
    },
    [autoCloseOnScan, confirmationDelayMs, cooldownMs, onClose, onScan, stopScanner]
  );

  const startScanner = useCallback(
    async (facing: "environment" | "user") => {
      setErrorMessage(null);
      setDetectedCode(null);
      setConfirmProgress(false);
      isDetectingRef.current = false;

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
          qrbox: { width: 270, height: 270 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: facing },
          config,
          (decodedText) => {
            handleDetected(decodedText);
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
          setErrorMessage(
            "Camera access denied. Please allow camera permissions in your browser settings."
          );
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          setErrorMessage("No camera found on this device.");
        } else {
          setErrorMessage(`Failed to start camera: ${msg}`);
        }
        setIsScanning(false);
      }
    },
    [handleDetected, scannerId, stopScanner]
  );

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
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
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

  const isLocationCode = detectedCode?.startsWith("LOC-") || detectedCode?.includes("-");

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 text-white z-20">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm tracking-tight">{title}</span>
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
            {/* Viewfinder Box */}
            <div
              className={`relative w-[270px] h-[270px] rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
                detectedCode
                  ? "border-4 border-emerald-400 bg-emerald-950/75 shadow-[0_0_60px_rgba(16,185,129,0.7)] scale-[1.03]"
                  : "border-2 border-emerald-400/80 bg-black/10 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
              }`}
            >
              {/* Corner Brackets */}
              <div
                className={`absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
                  detectedCode ? "border-emerald-300" : "border-emerald-400"
                }`}
              />
              <div
                className={`absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
                  detectedCode ? "border-emerald-300" : "border-emerald-400"
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
                  detectedCode ? "border-emerald-300" : "border-emerald-400"
                }`}
              />
              <div
                className={`absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 rounded-br-xl transition-colors ${
                  detectedCode ? "border-emerald-300" : "border-emerald-400"
                }`}
              />

              {/* Aiming Reticle Crosshair when seeking */}
              {!detectedCode && (
                <>
                  <div className="absolute w-4 h-0.5 bg-emerald-400/40" />
                  <div className="absolute w-0.5 h-4 bg-emerald-400/40" />
                  {/* Animated Laser Scanning Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10B981] animate-[scanLaser_2s_ease-in-out_infinite]" />
                </>
              )}

              {/* LOCK-ON / CONFIRMATION DISPLAY WHEN DETECTED */}
              {detectedCode && (
                <div className="flex flex-col items-center justify-center p-3 text-center space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-7 h-7 animate-bounce" />
                  </div>

                  {/* Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/50">
                    {isLocationCode ? (
                      <>
                        <MapPin className="w-3 h-3" />
                        <span>Location Detected</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3 h-3" />
                        <span>Item Detected</span>
                      </>
                    )}
                  </span>

                  {/* Decoded Value */}
                  <div className="font-mono text-base font-black text-white px-2.5 py-1 bg-black/80 rounded-lg border border-emerald-500/60 max-w-[240px] truncate shadow-inner">
                    {detectedCode}
                  </div>

                  <span className="text-[11px] font-bold text-emerald-300">
                    인식 완료! 확인 중...
                  </span>

                  {/* Confirmation Progress Bar */}
                  <div className="w-40 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 border border-emerald-500/30">
                    <div
                      className={`h-full bg-emerald-400 transition-all ease-linear ${
                        confirmProgress ? "w-full" : "w-0"
                      }`}
                      style={{ transitionDuration: `${confirmationDelayMs}ms` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Message Pill below Viewfinder */}
            <div
              className={`mt-5 px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2 ${
                detectedCode
                  ? "bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : "bg-zinc-900/85 backdrop-blur border-zinc-700 text-zinc-200"
              }`}
            >
              {detectedCode ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold font-mono">
                    TARGET LOCKED: {detectedCode}
                  </span>
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="text-xs font-semibold">
                    사각 영역 안에 2D QR 또는 바코드를 비춰주세요
                  </span>
                </>
              )}
            </div>
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
      <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>2D QR (선반 로케이션), Code 128, UPC/EAN 상품 바코드 자동 감지</span>
      </div>

      {/* CSS Animation for Laser Line */}
      <style jsx global>{`
        @keyframes scanLaser {
          0% {
            transform: translateY(-120px);
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(120px);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
