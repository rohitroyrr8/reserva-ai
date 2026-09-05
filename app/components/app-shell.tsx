import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "@/components/mark";
import { StepDots } from "@/components/step-dots";

export function AppShell({
  children,
  steps,
  status,
}: {
  children: ReactNode;
  steps?: { current: number; total: number };
  status?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[420px] items-center justify-between px-4 pt-6 pb-2">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Mark className="size-6 text-mint" />
          <span className="font-display text-[17px] font-semibold tracking-[0.18em] uppercase">
            Reserva
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {steps ? <StepDots current={steps.current} total={steps.total} /> : status}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-4 pt-8 pb-10">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[420px] px-4 pb-8">
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Reserva holds the money. Chat runs it.
          </p>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-mint-dim uppercase">
            <span className="size-1.5 rounded-full bg-mint/80" />
            Arc
          </span>
        </div>
      </footer>
    </div>
  );
}
