"use client";

import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { Tag } from "@/components/reserve-gauge";
import { useProgram } from "@/lib/program";

export default function ActivityPage() {
  const { state } = useProgram();

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Activity"
        lede="Everything that moved points or money, and who asked for it."
        actions={<Btn variant="ghost">Export</Btn>}
      />

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">When</th>
            <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">What happened</th>
            <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">Where it came from</th>
            <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">Amount</th>
          </tr>
        </thead>
        <tbody>
          <Row when="2026-09-05T14:02:00" what="Fatima redeemed 600 points" hash="0x9c2a…71bd" source="Counter code" amount="6.00 USDC" />
          <Row when="2026-09-05T13:47:00" what="Morning double points turned off" hash="Rule change" sourceTag="Telegram" amount="—" />
          <Row when="2026-09-05T12:11:00" what="Omar earned 180 points" hash="5% on 36.00 USDC" sourceTag="Telegram" amount="1.80 USDC" />
          <Row when="2026-09-05T11:20:00" what="Withdrawal of 150 USDC requested" hash="Waiting for ops@" sourceTag="Console" amount="150.00 USDC" />
          <Row when="2026-09-04T10:04:00" what="Lina joined and claimed 200 points" hash="Welcome bonus" sourceTag="Telegram" amount="2.00 USDC" />
          <Row when="2026-09-03T09:05:00" what="Reserve topped up" hash="0x41f8…c027" sourceTag="Console" amount="500.00 USDC" />
        </tbody>
      </table>

      <div className="mt-6 border border-line bg-[#FAFBFA] p-4">
        <div className="mb-2.5 text-[13px] text-ink-soft">The same actions, as the merchant did them</div>
        <div className="ml-auto mb-2 max-w-[88%] rounded-[10px] border border-reserve bg-reserve-tint px-3 py-2 text-sm">
          turn off the morning double points
        </div>
        <div className="max-w-[88%] rounded-[10px] border border-line bg-paper px-3 py-2 text-sm">
          Done — morning double points is off from now. Your reserve now lasts about 9 weeks instead of 6.
        </div>
      </div>
    </ConsoleShell>
  );
}

function formatActivityDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatActivityTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({
  when,
  what,
  hash,
  source,
  sourceTag,
  amount,
}: {
  when: string;
  what: string;
  hash: string;
  source?: string;
  sourceTag?: string;
  amount: string;
}) {
  return (
    <tr>
      <td className="border-b border-wash py-2.5 pr-3 align-top tabular">
        <div>{formatActivityDate(when)}</div>
        <div className="text-xs text-ink-faint">{formatActivityTime(when)}</div>
      </td>
      <td className="border-b border-wash py-2.5 pr-3 align-top">
        {what}
        <div className="text-xs text-ink-faint">{hash}</div>
      </td>
      <td className="border-b border-wash py-2.5 pr-3 align-top">
        {sourceTag ? <Tag>{sourceTag}</Tag> : source}
      </td>
      <td className="money border-b border-wash py-2.5 text-right align-top">{amount}</td>
    </tr>
  );
}
