"use client";

import { use, useEffect, useState } from "react";
import { Btn } from "@/components/console-shell";
import { MERCHANT_NAME, TELEGRAM_BOT_URL } from "@/lib/format";
import { sleep, useProgram } from "@/lib/program";

type Phase = "ready" | "checking" | "success" | "already" | "expired" | "fail";

export default function EnrollPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { state, hydrated, update } = useProgram();
  const [phase, setPhase] = useState<Phase>(() => {
    const key = code.toLowerCase();
    if (key === "expired") return "expired";
    if (key === "joined") return "already";
    return "ready";
  });

  useEffect(() => {
    if (!hydrated) return;
    if (state.enrolledCodes.includes(code.toLowerCase())) setPhase("already");
  }, [hydrated, state.enrolledCodes, code]);

  async function takeSelfie() {
    setPhase("checking");
    await sleep(900);
    if (code.toLowerCase() === "fail") {
      setPhase("fail");
      return;
    }
    update({ enrolledCodes: [...state.enrolledCodes, code.toLowerCase()] });
    setPhase("success");
  }

  return (
    <div className="min-h-dvh bg-wash px-6 py-16">
      <div className="mx-auto max-w-[480px] border border-line bg-paper px-8 py-10">
        <p className="text-[11px] text-ink-faint">Reserva</p>
        {phase === "expired" ? (
          <>
            <h1 className="mt-2 text-xl font-semibold">This link expired.</h1>
            <p className="mt-2 text-sm text-ink-soft">Ask the bot for a new one.</p>
            <Btn className="mt-6" href={TELEGRAM_BOT_URL}>
              Back to Telegram
            </Btn>
          </>
        ) : phase === "already" || phase === "success" ? (
          <>
            <h1 className="mt-2 text-xl font-semibold">
              {phase === "already" ? "You're already in." : "You're in."}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Go back to Telegram. Points land when you visit.
            </p>
            <Btn className="mt-6" href={TELEGRAM_BOT_URL}>
              Back to Telegram
            </Btn>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-xl font-semibold">
              Join {state.businessName || MERCHANT_NAME}&apos;s loyalty
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              One selfie to confirm you&apos;re a person. We don&apos;t keep the photo
              and we don&apos;t take an ID.
            </p>
            {phase === "fail" ? (
              <p role="alert" className="mt-4 text-sm text-stop">
                That didn&apos;t work. Try the selfie again.
              </p>
            ) : null}
            <Btn className="mt-6" disabled={phase === "checking"} onClick={takeSelfie}>
              {phase === "checking" ? "Checking…" : "Take a selfie"}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
