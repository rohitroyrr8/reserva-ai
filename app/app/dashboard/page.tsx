"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { Tag } from "@/components/reserve-gauge";
import {
  forecastWeeks,
  freeReserve,
  programInsights,
  runwayWeeks,
  salesFromReserve,
  weeklyBurn,
} from "@/lib/forecast";
import { formatUsd } from "@/lib/format";
import { nextSetupHref, useProgram } from "@/lib/program";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { state, hydrated } = useProgram();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.created || state.funded <= 0) router.replace(nextSetupHref(state));
  }, [hydrated, state, router]);

  if (!hydrated || !state.created || state.funded <= 0) {
    return (
      <ConsoleShell>
        <p className="text-sm text-ink-soft">Loading…</p>
      </ConsoleShell>
    );
  }

  const burn = weeklyBurn(state);
  const free = freeReserve(state);
  const weeks = runwayWeeks(state);
  const sales = salesFromReserve(state);
  const forecast = forecastWeeks(state);
  const insights = programInsights(state);
  const maxReserve = Math.max(state.funded, 1);

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <PageHead
        title="Dashboard"
        lede={`${state.businessName} · ${state.category} · what the reserve will do over the next eight weeks.`}
        actions={
          <>
            <Btn variant="ghost" href="/configure">
              Configure
            </Btn>
            <Btn href="/reserve/fund">Add money</Btn>
          </>
        }
      />

      <div className="mb-8 grid gap-8 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label="Runway"
          value={weeks === Infinity ? "—" : `${weeks}`}
          unit={weeks === Infinity ? "" : "weeks"}
        />
        <Figure label="Promised each week" value={formatUsd(burn)} unit="USDC" />
        <Figure label="Still free" value={formatUsd(free)} unit="USDC" />
        <Figure label="Sales this reserve covers" value={formatUsd(sales.total, 0)} unit="USDC" />
      </div>

      <div className="mb-10 border-b border-line pb-8">
        <p className="sec-title">Potential sales</p>
        <p className="mb-4 max-w-[58ch] text-sm text-ink-soft">
          At {state.cashbackPct}% back
          {state.morningDouble ? ", with morning double on" : ""}, the money you
          set aside is the ceiling on tickets you can take before issuing pauses.
        </p>
        <dl className="grid max-w-[640px] gap-x-10 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-soft">Whole reserve covers</dt>
            <dd className="font-serif text-[1.65rem] leading-none tracking-[-0.02em]">
              {formatUsd(sales.total, 0)}{" "}
              <small className="text-sm text-ink-soft">USDC of sales</small>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Still able to take</dt>
            <dd className="font-serif text-[1.65rem] leading-none tracking-[-0.02em]">
              {formatUsd(sales.remaining, 0)}{" "}
              <small className="text-sm text-ink-soft">USDC of sales</small>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Typical week for a {state.category.toLowerCase()}</dt>
            <dd className="mt-0.5 text-sm">{formatUsd(sales.weekly, 0)} USDC</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-soft">Weeks of trade still covered</dt>
            <dd className="mt-0.5 text-sm">
              {sales.weekly > 0
                ? `~${Math.max(0, Math.round((sales.remaining / sales.weekly) * 10) / 10)} weeks`
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section>
          <p className="sec-title">Eight-week forecast</p>
          <p className="mb-5 max-w-[52ch] text-sm text-ink-soft">
            Remaining reserve if the current rules keep running. Columns drop as
            points are promised. Amber is already owed.
          </p>

          <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-[10px] border border-reserve bg-reserve-tint" />
              Still free
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-[10px] border border-promised bg-promised-tint" />
              Promised
            </span>
          </div>
          <div className="mb-6 flex h-40 items-end gap-2">
            {forecast.map((week) => {
              const remainPct = (week.remaining / maxReserve) * 100;
              const promisedPct = (week.promised / maxReserve) * 100;
              return (
                <div key={week.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "relative flex h-32 w-full flex-col-reverse overflow-hidden border",
                      week.paused ? "border-stop bg-stop-tint" : "border-line bg-wash",
                    )}
                    title={`${week.label}: ${formatUsd(week.remaining)} free`}
                  >
                    <div
                      className="w-full bg-promised-tint"
                      style={{ height: `${Math.min(promisedPct, 100)}%` }}
                    />
                    <div
                      className="w-full bg-reserve-tint"
                      style={{ height: `${Math.min(remainPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-faint">{week.label}</span>
                </div>
              );
            })}
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-line pb-2 text-left text-[13px] font-medium text-ink-soft">
                  Week of
                </th>
                <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">
                  Promised
                </th>
                <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">
                  Still free
                </th>
                <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">
                  Sales covered
                </th>
                <th className="border-b border-line pb-2 text-right text-[13px] font-medium text-ink-soft">
                  Issuing
                </th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((week) => (
                <tr key={week.label}>
                  <td className="border-b border-wash py-2.5">{week.label}</td>
                  <td className="money border-b border-wash py-2.5 text-right">
                    {formatUsd(week.promised)}
                  </td>
                  <td className="money border-b border-wash py-2.5 text-right">
                    {formatUsd(week.remaining)}
                  </td>
                  <td className="money border-b border-wash py-2.5 text-right">
                    {formatUsd(week.sales, 0)}
                  </td>
                  <td className="border-b border-wash py-2.5 text-right">
                    {week.paused ? <Tag tone="no">Paused</Tag> : <Tag tone="ok">On</Tag>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside>
          <p className="sec-title">Reserva read</p>
          <ol className="m-0 list-none p-0">
            {insights.map((item) => (
              <li key={item.title} className="border-b border-wash py-4 first:pt-0">
                <Tag tone={item.tone}>
                  {item.tone === "ok" ? "Fine" : item.tone === "hold" ? "Watch" : "Act"}
                </Tag>
                <h2 className="mt-2 text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 text-[13px] text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[13px] text-ink-faint">
            Change a rule on Configure or add money to the reserve — the forecast
            updates from what you have set aside.
          </p>
        </aside>
      </div>
    </ConsoleShell>
  );
}

function Figure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[13px] text-ink-soft">{label}</div>
      <span className="font-serif text-[2.35rem] leading-none tracking-[-0.03em]">
        {value}
        {unit ? <small className="ml-1.5 text-base text-ink-soft">{unit}</small> : null}
      </span>
    </div>
  );
}
