"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return <div className="min-h-dvh bg-paper px-8 py-7 text-sm text-ink-soft">Loading…</div>;
  }

  return <>{children}</>;
}
