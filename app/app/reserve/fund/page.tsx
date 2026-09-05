"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { DEMO_WALLET, formatUsd, truncateAddress } from "@/lib/format";
import { nextSetupHref, sleep, useProgram } from "@/lib/program";

export default function FundPage() {
  const { state, hydrated, update } = useProgram();
  const router = useRouter();
  const [amount, setAmount] = useState("500.00");
  const [busy, setBusy] = useState(false);
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const points = valid ? parsed * 100 : 0;
  const settingUp = !state.live;

  useEffect(() => {
    if (!hydrated) return;
    if (!state.created) router.replace("/configure");
  }, [hydrated, state.created, router]);

  async function confirmSent() {
    if (!valid) return;
    setBusy(true);
    await sleep(600);
    const next = { ...state, funded: state.funded + parsed, created: true };
    update(next);
    setBusy(false);
    router.push(state.live ? "/reserve" : nextSetupHref(next));
  }

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Add money to the reserve"
        lede="Every point you issue is backed by this balance. You can add more at any time and withdraw what isn't promised."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-5">
            <label htmlFor="amount" className="mb-1 block text-sm font-medium">
              Amount
            </label>
            <div className="flex items-center gap-2.5">
              <input
                id="amount"
                className="control max-w-[160px]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="text-sm text-ink-soft">USDC</span>
            </div>
          </div>
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium">How you&apos;re paying</label>
            <p className="mb-1.5 text-[13px] text-ink-soft">
              Send from an exchange or wallet to the address below, or buy USDC with a card.
            </p>
            <div className="border border-line p-3 text-[13px]">
              <div className="mb-1 text-ink-soft">Your program address</div>
              <div className="text-ink-faint">
                {truncateAddress(DEMO_WALLET)}
                <span className="mx-1.5">·</span>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-ink underline-offset-2 hover:underline"
                  onClick={() => navigator.clipboard.writeText(DEMO_WALLET)}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <Btn disabled={!valid || busy} onClick={confirmSent}>
            {busy ? "Confirming…" : "Buy USDC with card"}
          </Btn>
          <Btn variant="ghost" className="ml-2" disabled={!valid || busy} onClick={confirmSent}>
            {busy ? "Confirming…" : "I've sent it"}
          </Btn>
          {settingUp ? (
            <Btn variant="quiet" className="ml-2" href="/configure">
              Back
            </Btn>
          ) : null}
        </div>

        <aside className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <dl className="m-0">
            <dt className="text-[13px] text-ink-soft">What {valid ? formatUsd(parsed, 0) : "—"} USDC buys you</dt>
            <dd className="money mt-0.5 text-[26px]">{valid ? formatUsd(points, 0) : "—"} points</dd>
            <dt className="mt-3.5 text-[13px] text-ink-soft">At 5% cashback</dt>
            <dd className="mt-0.5">
              Covers about <b>{valid ? formatUsd(parsed / 0.05, 0) : "—"} USDC</b> of customer spend
            </dd>
            <dt className="mt-3.5 text-[13px] text-ink-soft">Runs out in</dt>
            <dd className="mt-0.5">~7 weeks at your current volume</dd>
          </dl>
        </aside>
      </div>
    </ConsoleShell>
  );
}
