interface Props {
  label: string;
  value: number;
  max?: number;
}

export default function RatingBar({ label, value, max = 5 }: Props) {
  const pct   = Math.round((value / max) * 100);
  const color =
    value >= 4 ? '#16a34a' :
    value >= 3 ? '#d97706' : '#dc2626';

  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[13px] text-[#737373] font-medium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[13px] font-black w-6 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}
