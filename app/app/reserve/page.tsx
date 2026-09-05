"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { Banner, ReserveGauge, Tag } from "@/components/reserve-gauge";
import { formatUsd } from "@/lib/format";
import { nextSetupHref, useProgram } from "@/lib/program";

export default function ReservePage() {
  const { state, hydrated } = useProgram();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.live) router.replace(nextSetupHref(state));
  }, [hydrated, state, router]);

  const full = state.funded > 0 && state.issued >= state.funded;
  const empty = state.issued === 0;

  if (!hydrated || !state.live) {
    return (
      <ConsoleShell>
        <p className="text-sm text-ink-soft">Loading…</p>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      {full ? (
        <Banner
          tone="stop"
          title="Issuing is paused — the reserve is fully promised"
          action={<Btn href="/reserve/fund">Add money</Btn>}
        >
          Customers can still redeem the points they already have. New points resume
          the moment you add money.
        </Banner>
      ) : null}

      <PageHead
        title="Reserve"
        lede={
          full
            ? undefined
            : empty
              ? "Live. The reserve is funded and nothing is promised yet."
              : `Live. ${formatUsd(state.issued)} USDC of your reserve is promised to customers who haven't redeemed yet.`
        }
        actions={
          <>
            <Btn variant="ghost" href="/withdraw">
              Withdraw
            </Btn>
            <Btn href="/reserve/fund">Add money</Btn>
          </>
        }
      />

      <ReserveGauge funded={state.funded} issued={state.issued} />

      {full ? (
        <>
          <p className="sec-title">What happens now</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <Row label="Customers earning points" tag={<Tag tone="no">Paused</Tag>} note="They're told the offer is full today, not that something broke." />
              <Row label="Customers redeeming" tag={<Tag tone="ok">Working</Tag>} note="Every outstanding point is still covered." />
              <Row label="Withdrawals" tag={<Tag tone="no">Blocked</Tag>} note="Nothing is free while the reserve is fully promised." />
            </tbody>
          </table>
        </>
      ) : (
        <>
          <p className="sec-title">Last seven days</p>
          {empty ? (
            <p className="text-sm text-ink-soft">
              No points issued yet. They appear here once customers start earning.
            </p>
          ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Day</Th>
                <Th>Members earning</Th>
                <Th align="right">Points issued</Th>
                <Th align="right">Redeemed</Th>
                <Th align="right">Settled</Th>
              </tr>
            </thead>
            <tbody>
              <DayRow day="Today" members="18" issued="1,940" redeemed="620" settled="6.20" />
              <DayRow day="Yesterday" members="24" issued="2,610" redeemed="1,100" settled="11.00" />
              <DayRow day="Wed" members="21" issued="2,180" redeemed="400" settled="4.00" />
            </tbody>
          </table>
          )}
        </>
      )}
    </ConsoleShell>
  );
}

function Th({ children, align }: { children: string; align?: "right" }) {
  return (
    <th
      className={`border-b border-line pb-2 pr-3 text-left text-[13px] font-medium text-ink-soft ${align === "right" ? "pr-0 text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function DayRow({
  day,
  members,
  issued,
  redeemed,
  settled,
}: {
  day: string;
  members: string;
  issued: string;
  redeemed: string;
  settled: string;
}) {
  return (
    <tr>
      <td className="border-b border-wash py-2.5 pr-3">{day}</td>
      <td className="border-b border-wash py-2.5 pr-3">{members}</td>
      <td className="border-b border-wash py-2.5 text-right tabular">{issued}</td>
      <td className="border-b border-wash py-2.5 text-right tabular">{redeemed}</td>
      <td className="money border-b border-wash py-2.5 text-right">{settled}</td>
    </tr>
  );
}

function Row({
  label,
  tag,
  note,
}: {
  label: string;
  tag: React.ReactNode;
  note: string;
}) {
  return (
    <tr>
      <td className="border-b border-wash py-2.5 pr-3">{label}</td>
      <td className="border-b border-wash py-2.5 pr-3">{tag}</td>
      <td className="border-b border-wash py-2.5 text-ink-soft">{note}</td>
    </tr>
  );
}
