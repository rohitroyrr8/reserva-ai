import { cn } from "@/lib/utils";

const styles = {
  live: "text-mint border-mint/30 bg-mint/8",
  settled: "text-mint border-mint/30 bg-mint/8",
  blocked: "text-destructive border-destructive/30 bg-destructive/10",
  pending: "text-amber border-amber/30 bg-amber/10",
} as const;

export function StatusWord({
  tone,
  children,
}: {
  tone: keyof typeof styles;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.14em] uppercase",
        styles[tone],
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "blocked" && "bg-destructive",
          tone === "pending" && "bg-amber",
          (tone === "live" || tone === "settled") && "bg-mint shadow-[0_0_8px_var(--mint)]",
        )}
      />
      {children}
    </span>
  );
}
