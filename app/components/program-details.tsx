import { Btn } from "@/components/console-shell";
import { Tag } from "@/components/reserve-gauge";
import { POINTS_PER_USDC, TELEGRAM_BOT_URL, TELEGRAM_HANDLE } from "@/lib/format";
import { approverList, type ProgramSnapshot } from "@/lib/program";

export function ProgramDetails({ state }: { state: ProgramSnapshot }) {
  const people = approverList(state.approvers);

  return (
    <section className="border-b border-line pb-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tag>{state.category}</Tag>
            {state.live ? <Tag tone="ok">Live</Tag> : <Tag tone="hold">Draft</Tag>}
          </div>
          <h2 className="font-serif text-[2.15rem] leading-[1.05] tracking-[-0.03em]">
            {state.businessName}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{state.location}</p>
          <p className="mt-3 font-serif text-[1.35rem] leading-none tracking-[-0.02em]">
            {Math.round(POINTS_PER_USDC / (state.pointRate || 1))} points = 1 USDC
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <Btn href={TELEGRAM_BOT_URL}>Talk on Telegram</Btn>
          <span className="text-[13px] text-ink-faint">{TELEGRAM_HANDLE}</span>
        </div>
      </div>

      <div className="mt-7">
        <p className="sec-title">Approvers</p>
        {people.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {people.map((person) => (
              <li
                key={person}
                className="border border-line bg-[#FAFBFA] px-2.5 py-1 text-[13px]"
              >
                {person}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">No approvers yet.</p>
        )}
      </div>
    </section>
  );
}
