import { formatUsd } from "@/lib/format";
import { StatRow } from "@/components/stat-row";

export function FundedBar({
  funded,
  issued,
  caption,
}: {
  funded: number;
  issued: number;
  caption?: string;
}) {
  const open = Math.max(funded - issued, 0);
  const issuedPct = funded > 0 ? Math.min((issued / funded) * 100, 100) : 0;

  return (
    <section className="border border-border bg-card/70 px-4 py-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.16em] text-mint uppercase">
          Vault · USDC
        </p>
        {caption ? (
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            {caption}
          </p>
        ) : null}
      </div>

      <dl>
        <StatRow label="Funded" value={funded} />
        <StatRow label="Issued" value={issued} />
        <StatRow label="Can still issue" value={open} />
      </dl>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden bg-foreground/8"
        role="img"
        aria-label={`${formatUsd(issued)} issued of ${formatUsd(funded)} funded`}
      >
        <div className="flex h-full w-full">
          <div className="bg-amber" style={{ width: `${issuedPct}%` }} />
          <div className="flex-1 bg-mint" />
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        <span>Issued</span>
        <span>Open</span>
      </div>
    </section>
  );
}
