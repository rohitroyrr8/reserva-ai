"use client";

import { useEffect, useState } from "react";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { formatUsd } from "@/lib/format";
import { seedLiveProgram, sleep, useProgram } from "@/lib/program";
import { usePrivy } from "@privy-io/react-auth";

export default function RedeemPage() {
  const { ready, authenticated, login } = usePrivy();
  const { state, hydrated, update } = useProgram();
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"empty" | "valid" | "settled" | "invalid">("empty");

  useEffect(() => {
    if (!hydrated) return;
    const seed = seedLiveProgram(state);
    if (seed) update(seed);
  }, [hydrated, state, update]);

  async function lookup(value: string) {
    setCode(value.toUpperCase());
    if (value.length < 6) {
      setPhase("empty");
      return;
    }
    await sleep(300);
    setPhase(value.toUpperCase() === "XXXXXX" ? "invalid" : "valid");
  }

  async function settle() {
    await sleep(500);
    update({
      funded: Math.max(state.funded - 4, 0),
      issued: Math.max(state.issued - 4, 0),
    });
    setPhase("settled");
  }

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Redeem at the counter"
        lede="Customer shows the one-time code. You type it. The vault releases."
      />

      {!authenticated ? (
        <Btn disabled={!ready} onClick={() => login()}>
          {ready ? "Sign in" : "Loading…"}
        </Btn>
      ) : phase === "settled" ? (
        <div>
          <p className="money text-[26px]">{formatUsd(4)} USDC released</p>
          <p className="mt-1 text-sm text-ink-soft">400 points closed</p>
          <Btn className="mt-6" onClick={() => { setCode(""); setPhase("empty"); }}>
            Next code
          </Btn>
        </div>
      ) : (
        <div className="max-w-[280px]">
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            One-time code
          </label>
          <input
            id="code"
            className="control font-mono tracking-[0.2em]"
            maxLength={6}
            value={code}
            onChange={(e) => lookup(e.target.value)}
          />
          {phase === "invalid" ? (
            <p className="mt-3 text-sm text-stop">That code isn&apos;t valid.</p>
          ) : null}
          {phase === "valid" ? (
            <p className="mt-3 text-sm">400 points · {formatUsd(4)} USDC</p>
          ) : null}
          <Btn className="mt-4" disabled={phase !== "valid"} onClick={settle}>
            Settle
          </Btn>
        </div>
      )}
    </ConsoleShell>
  );
}
