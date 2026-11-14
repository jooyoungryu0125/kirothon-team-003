interface Props {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      className="h-2 w-full overflow-hidden rounded-full bg-border"
    >
      <div className="h-full rounded-full bg-pink-light transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
