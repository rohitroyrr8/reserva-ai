import { formatPoints, formatUsd, POINTS_PER_USDC } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ReserveGauge({
  funded,
  issued,
}: {
  funded: number;
  issued: number;
}) {
  const free = Math.max(funded - issued, 0);
  const coverage = issued > 0 ? Math.round((funded / issued) * 100) : funded > 0 ? Infinity : 0;
  const promisedPct = funded > 0 ? Math.min((issued / funded) * 100, 100) : 0;
  const full = funded > 0 && issued >= funded;

  return (
    <section className="mb-7 border border-line px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end gap-7">
        <Figure label="In reserve" value={formatUsd(funded)} unit="USDC" large />
        <div className="w-px self-stretch bg-line" />
        <Figure label="Promised to customers" value={formatUsd(issued)} unit="USDC" />
        <Figure label="Free to withdraw" value={formatUsd(free)} unit="USDC" />
        <div className="ml-auto text-right">
          <div className="mb-0.5 text-[13px] text-ink-soft">Coverage</div>
          <span className={cn("money text-[22px] leading-none", full ? "text-stop" : "text-reserve")}>
            {coverage === Infinity ? "—" : `${coverage}%`}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative h-[38px] overflow-hidden border bg-reserve-tint",
          full ? "border-stop" : "border-reserve",
        )}
        role="img"
        aria-label={`${formatUsd(issued)} promised of ${formatUsd(funded)} in reserve`}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 border-r-2",
            full ? "border-stop" : "border-promised",
          )}
          style={{
            width: `${promisedPct}%`,
            backgroundColor: "var(--promised-tint)",
            backgroundImage:
              "repeating-linear-gradient(-45deg,transparent 0 7px,rgba(176,105,43,.22) 7px 8px)",
          }}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-5 text-[13px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-[11px] border border-promised bg-promised-tint" />
          Promised — {formatPoints(issued * POINTS_PER_USDC)} points outstanding
        </span>
        {!full ? (
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-[11px] border border-reserve bg-reserve-tint" />
            Free — can be withdrawn or issued
          </span>
        ) : null}
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  unit,
  large,
}: {
  label: string;
  value: string;
  unit: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[13px] text-ink-soft">{label}</div>
      <span className={cn("money leading-none", large ? "text-[38px]" : "text-[22px]")}>
        {value}
        <small className="ml-1 text-base text-ink-soft">{unit}</small>
      </span>
    </div>
  );
}

export function Banner({
  tone,
  title,
  children,
  action,
}: {
  tone: "stop" | "warn";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex gap-3 border px-4 py-3.5 text-sm",
        tone === "stop" && "border-stop bg-stop-tint",
        tone === "warn" && "border-promised bg-promised-tint",
      )}
    >
      <div>
        <b className="mb-0.5 block font-semibold">{title}</b>
        <p className="m-0 text-ink-soft">{children}</p>
      </div>
      {action ? <div className="ml-auto shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function Tag({
  children,
  tone = "plain",
}: {
  children: string;
  tone?: "plain" | "ok" | "hold" | "no";
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-[3px] border px-1.5 py-0.5 text-xs",
        tone === "plain" && "border-line text-ink-soft",
        tone === "ok" && "border-reserve bg-reserve-tint text-reserve",
        tone === "hold" && "border-promised bg-promised-tint text-promised",
        tone === "no" && "border-stop bg-stop-tint text-stop",
      )}
    >
      {children}
    </span>
  );
}
