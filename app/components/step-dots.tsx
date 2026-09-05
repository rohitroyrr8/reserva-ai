import { cn } from "@/lib/utils";

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <ol className="flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-muted-foreground">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={n} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-border">·</span>}
            <span
              className={cn(
                "tabular",
                active && "text-mint",
                done && "text-foreground/70",
                !active && !done && "text-muted-foreground/50",
              )}
            >
              {n}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
