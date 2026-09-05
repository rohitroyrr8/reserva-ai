"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = usePrivy();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const email =
    user?.email?.address ??
    user?.linkedAccounts?.find((account) => account.type === "email" && "address" in account)
      ?.address;
  const phone =
    user?.phone?.number ??
    user?.linkedAccounts?.find((account) => account.type === "phone" && "number" in account)
      ?.number;
  const label = email || phone || "Signed in";

  async function signOut() {
    await logout();
    router.replace("/");
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="max-w-[180px] truncate border-0 bg-transparent p-0 text-right text-[13px] text-ink-soft"
        >
          {label}
        </button>
        {open ? (
          <div className="absolute right-0 z-20 mt-2 w-64 border border-line bg-paper p-3 shadow-sm">
            <AccountBody email={email} phone={phone} onSignOut={signOut} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-t border-line px-5 py-4">
      <AccountBody email={email} phone={phone} onSignOut={signOut} />
    </div>
  );
}

function AccountBody({
  email,
  phone,
  onSignOut,
}: {
  email?: string;
  phone?: string;
  onSignOut: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] tracking-[0.04em] text-ink-faint uppercase">
        Signed in
      </p>
      {email ? (
        <p className="text-[13px]">
          <span className="text-ink-soft">Email </span>
          {email}
        </p>
      ) : null}
      {phone ? (
        <p className="mt-0.5 text-[13px]">
          <span className="text-ink-soft">Mobile </span>
          {phone}
        </p>
      ) : null}
      {!email && !phone ? (
        <p className="text-[13px] text-ink-soft">Privy session</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            "cursor-pointer border-0 bg-transparent p-0 text-[13px] text-ink-soft underline-offset-2 hover:text-ink hover:underline",
          )}
        >
          Disconnect
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
