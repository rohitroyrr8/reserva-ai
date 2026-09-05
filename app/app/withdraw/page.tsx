"use client";

import { useEffect, useState } from "react";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { Banner, Tag } from "@/components/reserve-gauge";
import { DAILY_CAP_USD, DAILY_LIMIT_USD, formatUsd } from "@/lib/format";
import { seedLiveProgram, sleep, useProgram } from "@/lib/program";

export default function WithdrawPage() {
  const { state, hydrated, update } = useProgram();
  const [amount, setAmount] = useState("150.00");
  const [phase, setPhase] = useState<"form" | "waiting">("waiting");

  useEffect(() => {
    if (!hydrated) return;
    const seed = seedLiveProgram(state);
    if (seed) update(seed);
  }, [hydrated, state, update]);

  const free = Math.max(state.funded - state.issued, 0);
  const parsed = Number(amount);
  const coverageAfter =
    state.issued > 0 ? Math.round(((state.funded - parsed) / state.issued) * 100) : 0;

  async function request() {
    await sleep(400);
    setPhase("waiting");
  }

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Withdraw from reserve"
        lede="You can take out anything that isn't already promised to a customer."
      />

      {phase === "waiting" ? (
        <Banner tone="warn" title="Waiting for a second approval" action={<Btn variant="ghost">Remind them</Btn>}>
          Withdrawals over {formatUsd(DAILY_LIMIT_USD, 0)} USDC need someone else to approve. Sent to
          ops@bloomcoffee.ae four minutes ago.
        </Banner>
      ) : null}

      {phase === "form" ? (
        <div className="mb-6 max-w-[200px]">
          <label htmlFor="wd" className="mb-1 block text-sm font-medium">
            Amount
          </label>
          <div className="flex items-center gap-2">
            <input
              id="wd"
              className="control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="text-sm text-ink-soft">USDC</span>
          </div>
          <Btn className="mt-4" onClick={request}>
            Request withdrawal
          </Btn>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="sec-title">This withdrawal</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <KV label="Amount" value={`${formatUsd(parsed)} USDC`} />
              <KV label="Requested by" value="rohit@bloomcoffee.ae" />
              <KV label="Free to withdraw" value={`${formatUsd(free)} USDC`} />
              <KV label="Coverage after" value={`${coverageAfter}%`} />
            </tbody>
          </table>
          <p className="sec-title mt-7">Checks</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <Check label="Enough free balance" tone="ok" status="Passed" />
              <Check label="Leaves every point covered" tone="ok" status="Passed" />
              <Check label="Under the daily limit" tone="ok" status="Passed" />
              <Check label="Second approval" tone="hold" status="Waiting" />
            </tbody>
          </table>
        </div>
        <aside className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <dl className="m-0">
            <dt className="text-[13px] text-ink-soft">Your limits</dt>
            <dd className="mt-0.5">{formatUsd(DAILY_LIMIT_USD, 0)} USDC without approval</dd>
            <dd className="text-sm text-ink-soft">{formatUsd(DAILY_CAP_USD, 0)} USDC per day, total</dd>
            <dt className="mt-3.5 text-[13px] text-ink-soft">Approvers</dt>
            <dd className="mt-0.5">
              rohit@bloomcoffee.ae
              <br />
              ops@bloomcoffee.ae
            </dd>
          </dl>
          <Btn variant="ghost" className="mt-4 w-full" href="/configure">
            Change limits
          </Btn>
        </aside>
      </div>
    </ConsoleShell>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="border-b border-wash py-2.5">{label}</td>
      <td className="money border-b border-wash py-2.5 text-right">{value}</td>
    </tr>
  );
}

function Check({
  label,
  tone,
  status,
}: {
  label: string;
  tone: "ok" | "hold";
  status: string;
}) {
  return (
    <tr>
      <td className="border-b border-wash py-2.5">{label}</td>
      <td className="border-b border-wash py-2.5 text-right">
        <Tag tone={tone}>{status}</Tag>
      </td>
    </tr>
  );
}
