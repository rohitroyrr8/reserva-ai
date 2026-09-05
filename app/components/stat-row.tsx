import { formatUsd } from "@/lib/format";

export function StatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  const display = typeof value === "number" ? formatUsd(value) : value;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className="font-mono text-sm tabular text-foreground">{display}</span>
        {hint ? (
          <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-wider text-amber">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
