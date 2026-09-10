import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/types/supabase";

type ReasonCode = Database['public']['Enums']['adjustment_reason'];

interface ReasonCodeSelectorProps {
  value: ReasonCode | null;
  onChange: (value: ReasonCode) => void;
  disabled?: boolean;
}

const REASONS: { code: ReasonCode; label: string; desc: string }[] = [
  { code: 'COUNT_MISMATCH', label: 'Count Mismatch', desc: 'Different from system count' },
  { code: 'DAMAGED', label: 'Damaged', desc: 'Box or item is damaged' },
  { code: 'LOST', label: 'Lost', desc: 'Cannot find physical item' },
  { code: 'FOUND', label: 'Found', desc: 'Item not in system found' },
  { code: 'EXPIRED', label: 'Expired', desc: 'Past expiration date' }
];

export function ReasonCodeSelector({ value, onChange, disabled = false }: ReasonCodeSelectorProps) {
  return (
    <div className="w-full">
      <Select 
        disabled={disabled} 
        value={value || undefined} 
        onValueChange={(val) => onChange(val as ReasonCode)}
      >
        <SelectTrigger className="w-full h-14 bg-zinc-900 border-zinc-700 text-base">
          <SelectValue placeholder="▼ Select Reason (Required)" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          {REASONS.map((r) => (
            <SelectItem 
              key={r.code} 
              value={r.code}
              className="h-12 text-base focus:bg-zinc-800 focus:text-white"
            >
              {r.label} <span className="text-zinc-500 text-sm ml-2">- {r.desc}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
