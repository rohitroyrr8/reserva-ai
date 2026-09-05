"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Btn } from "@/components/console-shell";
import { nextSetupHref, useProgram } from "@/lib/program";

export default function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const { state, hydrated } = useProgram();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authenticated || !hydrated) return;
    router.replace(state.live ? "/dashboard" : nextSetupHref(state));
  }, [ready, authenticated, hydrated, state, router]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/landing-cafe.jpg')" }}
      />
      <div className="absolute inset-0 bg-[#17262B]/55" />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="text-[13px] tracking-[0.14em] text-white/70 uppercase">Reserva</p>
        <h1 className="mt-3 max-w-[18ch] font-semibold text-[2.5rem] leading-[1.1] tracking-[-0.03em] text-white md:text-[3.25rem]">
          Loyalty you have actually set money aside for.
        </h1>
        <p className="mt-4 max-w-[42ch] text-[17px] leading-relaxed text-white/80">
          Fund a reserve in USDC. Issue only what you hold. Redeem at the counter
          in seconds.
        </p>
        <div className="mt-8">
          <Btn
            className="border-white bg-white text-ink"
            disabled={!ready}
            onClick={() => login()}
          >
            {ready ? "Sign in or register" : "Loading…"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
