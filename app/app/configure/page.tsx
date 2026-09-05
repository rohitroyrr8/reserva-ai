"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, ConsoleShell, PageHead } from "@/components/console-shell";
import { ProgramDetails } from "@/components/program-details";
import { formatUsd } from "@/lib/format";
import {
  PROGRAM_CATEGORIES,
  nextSetupHref,
  type ProgramCategory,
  useProgram,
} from "@/lib/program";

export default function ConfigurePage() {
  const { state, hydrated, update } = useProgram();
  const router = useRouter();
  const [morningDouble, setMorningDouble] = useState(state.morningDouble);
  const [welcomeOn, setWelcomeOn] = useState(state.welcomeBonus > 0);
  const settingUp = !state.live;
  const empty = state.issued === 0;

  useEffect(() => {
    if (!hydrated) return;
    if (state.created && state.funded <= 0 && !state.live) {
      router.replace("/reserve/fund");
    }
    setMorningDouble(state.morningDouble);
    setWelcomeOn(state.welcomeBonus > 0);
  }, [hydrated, state, router]);

  function goLive() {
    update({
      rulesSet: true,
      cashbackPct: 5,
      morningDouble,
      welcomeBonus: welcomeOn ? 200 : 0,
      weeklyCap: 2000,
      live: true,
      liveAt: new Date().toISOString(),
    });
  }

  if (!hydrated) {
    return (
      <ConsoleShell>
        <p className="text-sm text-ink-soft">Loading…</p>
      </ConsoleShell>
    );
  }

  if (!state.created) {
    return (
      <ConsoleShell>
        <CreateProgramForm />
      </ConsoleShell>
    );
  }

  if (state.funded <= 0 && !state.live) {
    return (
      <ConsoleShell>
        <p className="text-sm text-ink-soft">Loading…</p>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell shopName={state.businessName} shopPlace={state.location}>
      <ProgramDetails state={state} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div>
          <PageHead
            title="Rules"
            lede={
              settingUp
                ? "How customers earn once you go live. You can change these later."
                : "How customers earn and redeem. Changes apply to future purchases only."
            }
            actions={state.live ? <Btn>Add a rule</Btn> : undefined}
          />

          <p className="sec-title">Earning</p>
          <Rule
            statement={
              <>
                Every purchase earns <em>5%</em> back in points
              </>
            }
            meta={empty ? "Always on · no points issued yet" : "Always on · 31,240 points issued this month"}
            locked
            on={true}
          />
          <Rule
            statement={
              <>
                Double points <em>before 11am, Sunday to Thursday</em>
              </>
            }
            meta={
              empty
                ? "Optional · applies after you go live"
                : "Ends 30 Sep · 4,100 points issued"
            }
            on={morningDouble}
            onToggle={settingUp ? setMorningDouble : undefined}
          />
          <Rule
            statement={
              <>
                New customers get <em>200 points</em> when they join
              </>
            }
            meta={empty ? "One per verified person" : "One per verified person · 62 claimed"}
            on={welcomeOn}
            onToggle={settingUp ? setWelcomeOn : undefined}
          />

          <p className="sec-title mt-8">Limits</p>
          <Rule
            statement={
              <>
                No more than <em>2,000 points</em> to one customer per week
              </>
            }
            meta="Protects the reserve from a single large spender"
            locked
            on={true}
          />

          {settingUp ? (
            <div className="mt-8">
              <Btn onClick={goLive}>Go live</Btn>
              <Btn variant="quiet" className="ml-2" href="/reserve/fund">
                Back
              </Btn>
            </div>
          ) : null}
        </div>

        <aside className="border border-promised bg-promised-tint p-4 lg:sticky lg:top-8">
          <h2 className="mb-3 text-sm font-semibold">What these rules cost</h2>
          <CostRow label="Points issued per week" value={empty ? "—" : "12,400"} />
          <CostRow
            label="Value promised per week"
            value={empty ? `${formatUsd(state.funded * 0.05)} USDC` : "124.00 USDC"}
          />
          <CostRow
            label="Reserve lasts"
            value={empty ? "~7 weeks" : "~6 weeks"}
            last
          />
        </aside>
      </div>
    </ConsoleShell>
  );
}

function Rule({
  statement,
  meta,
  on,
  locked,
  onToggle,
}: {
  statement: React.ReactNode;
  meta: string;
  on: boolean;
  locked?: boolean;
  onToggle?: (next: boolean) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-3 border-b border-wash py-4 ${on ? "border-l-[3px] border-l-reserve pl-3" : "border-l-[3px] border-l-transparent pl-3 opacity-50"}`}
    >
      <div>
        <div className="text-[15px] [&_em]:bg-reserve-tint [&_em]:px-1 [&_em]:not-italic">
          {statement}
        </div>
        <div className="mt-1 text-[13px] text-ink-soft">{meta}</div>
      </div>
      {onToggle ? (
        <button
          type="button"
          onClick={() => onToggle(!on)}
          className={`cursor-pointer border px-2 py-0.5 text-[12px] ${
            on
              ? "border-reserve bg-reserve-tint text-reserve"
              : "border-line bg-transparent text-ink-soft"
          }`}
        >
          {on ? "On" : "Off"}
        </button>
      ) : locked ? (
        <span className="text-[12px] text-ink-faint">{on ? "On" : "Off"}</span>
      ) : (
        <Btn variant="ghost">Edit</Btn>
      )}
    </div>
  );
}

function CostRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1.5 text-sm ${last ? "font-semibold" : "border-b border-promised/20"}`}
    >
      <span>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}

function CreateProgramForm() {
  const { state, update } = useProgram();
  const router = useRouter();
  const [name, setName] = useState(state.businessName || "Bloom Coffee");
  const [category, setCategory] = useState<ProgramCategory>(state.category || "Cafe");
  const [location, setLocation] = useState(state.location || "Al Quoz");
  const [approvers, setApprovers] = useState<string[]>(state.approvers);
  const [draft, setDraft] = useState("");

  function addApprover() {
    const email = draft.trim();
    if (!email || approvers.includes(email)) return;
    setApprovers([...approvers, email]);
    setDraft("");
  }

  function saveProgram() {
    const next = {
      ...state,
      created: true,
      walletReady: true,
      businessName: name.trim() || "Bloom Coffee",
      category,
      location: location.trim() || "Al Quoz",
      approvers,
    };
    update(next);
    router.push(nextSetupHref(next));
  }

  return (
    <>
      <PageHead
        title="Configure"
        lede="Name the shop, then fund the reserve. You can change this later."
      />
      <form
        className="max-w-[560px]"
        onSubmit={(e) => {
          e.preventDefault();
          saveProgram();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="business" label="Program name" help="Shown at enrolment and at the counter.">
            <input
              id="business"
              className="control"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id="category" label="Category" help="Cafe, retail, salon, and so on.">
            <select
              id="category"
              className="control"
              value={category}
              onChange={(e) => setCategory(e.target.value as ProgramCategory)}
            >
              {PROGRAM_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="location" label="Location" help="Neighbourhood or city.">
          <input
            id="location"
            className="control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field
          id="approver-draft"
          label="Approvers"
          help="Withdrawals above your limit need a second person to approve."
        >
          <ul className="mb-3 flex list-none flex-wrap gap-2 p-0">
            {approvers.map((person) => (
              <li
                key={person}
                className="flex items-center gap-2 border border-line bg-[#FAFBFA] px-2.5 py-1 text-[13px]"
              >
                <span>{person}</span>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-ink-faint hover:text-ink"
                  onClick={() => setApprovers(approvers.filter((item) => item !== person))}
                  aria-label={`Remove ${person}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              id="approver-draft"
              className="control"
              value={draft}
              placeholder="email@business.com"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addApprover();
                }
              }}
            />
            <Btn type="button" variant="ghost" onClick={addApprover}>
              Add
            </Btn>
          </div>
        </Field>
        <Btn type="submit">Create program</Btn>
      </form>
    </>
  );
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <p className="mb-1.5 text-[13px] text-ink-soft">{help}</p>
      {children}
    </div>
  );
}
