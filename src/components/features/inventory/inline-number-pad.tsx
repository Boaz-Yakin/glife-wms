import { Button } from "@/components/ui/button";

interface InlineNumberPadProps {
  onAdjust: (amount: number) => void;
  disabled?: boolean;
}

export function InlineNumberPad({ onAdjust, disabled = false }: InlineNumberPadProps) {
  const handleTap = (amount: number) => {
    onAdjust(amount);
    // 햅틱 피드백 (간단한 진동)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2 my-4">
      <Button 
        variant="outline" 
        className="h-16 text-xl font-bold bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-rose-400 touch-manipulation"
        onClick={() => handleTap(-10)}
        disabled={disabled}
      >
        -10
      </Button>
      <Button 
        variant="outline" 
        className="h-16 text-xl font-bold bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-rose-400 touch-manipulation"
        onClick={() => handleTap(-1)}
        disabled={disabled}
      >
        -1
      </Button>
      <Button 
        variant="outline" 
        className="h-16 text-xl font-bold bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-emerald-400 touch-manipulation"
        onClick={() => handleTap(1)}
        disabled={disabled}
      >
        +1
      </Button>
      <Button 
        variant="outline" 
        className="h-16 text-xl font-bold bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-emerald-400 touch-manipulation"
        onClick={() => handleTap(10)}
        disabled={disabled}
      >
        +10
      </Button>
    </div>
  );
}
