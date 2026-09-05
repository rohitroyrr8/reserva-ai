"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/account-menu";
import { AuthGate } from "@/components/auth-gate";
import { cn } from "@/lib/utils";

export function ConsoleShell({
  children,
  shopName,
  shopPlace,
}: {
  children: ReactNode;
  shopName?: string;
  shopPlace?: string;
}) {
  const pathname = usePathname();
  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reserve", label: "Reserve" },
    { href: "/configure", label: "Configure" },
    { href: "/members", label: "Members" },
    { href: "/activity", label: "Activity" },
  ];

  return (
    <AuthGate>
    <div className="flex min-h-dvh bg-paper">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col self-start overflow-y-auto border-r border-line bg-[#FAFBFA] md:flex">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2 font-semibold tracking-[-0.02em]">
            <span className="inline-block size-2.5 bg-reserve" aria-hidden />
            Reserva
          </div>
          <span className="mt-1 block pl-[18px] text-[11px] tracking-[0.04em] text-ink-faint uppercase">
            Merchant console
          </span>
        </div>
        <nav className="flex flex-col px-2">
          {nav.map((item) => {
            const on =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-l-[3px] border-transparent px-3.5 py-2 text-sm text-ink-soft no-underline",
                  on && "border-l-reserve bg-reserve-tint font-medium text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          {shopName ? (
            <div className="border-t border-line px-5 py-4 text-[13px] text-ink-soft">
              <b className="block font-medium text-ink">{shopName}</b>
              {shopPlace}
            </div>
          ) : null}
          <AccountMenu />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-3 md:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-block size-2 bg-reserve" aria-hidden />
            Reserva
          </div>
          <AccountMenu compact />
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
          {nav.map((item) => {
            const on =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 px-2.5 py-1 text-[13px] text-ink-soft no-underline",
                  on && "bg-reserve-tint font-medium text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 px-5 py-7 md:px-10 md:py-9">
          <div className="mx-auto w-full max-w-[1080px]">{children}</div>
        </div>
      </div>
    </div>
    </AuthGate>
  );
}

export function PageHead({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div>
        <h1 className="font-serif text-[1.85rem] font-normal leading-none tracking-[-0.03em]">{title}</h1>
        {lede ? (
          <p className="mt-1 max-w-[56ch] text-sm text-ink-soft">{lede}</p>
        ) : null}
      </div>
      {actions ? <div className="ml-auto flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function Facts({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="max-w-[560px]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-1 gap-1 border-b border-wash py-3 text-sm sm:grid-cols-[168px_1fr] sm:gap-4"
        >
          <dt className="text-ink-soft">{row.label}</dt>
          <dd className="m-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Btn({
  children,
  href,
  variant = "solid",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "solid" | "ghost" | "quiet" | "danger";
}) {
  const styles = {
    solid: "border-ink bg-ink text-white",
    ghost: "border-line bg-transparent text-ink",
    quiet: "border-transparent bg-transparent px-0 text-ink-soft",
    danger: "border-stop bg-stop text-white",
  }[variant];
  const cls = cn(
    "inline-flex cursor-pointer items-center justify-center rounded-[4px] border px-3.5 py-2 text-sm font-medium",
    styles,
    className,
  );
  if (href) {
    if (href.startsWith("http")) {
      return (
        <a href={href} className={cls} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={props.type ?? "button"} className={cls} {...props}>
      {children}
    </button>
  );
}
