"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "reserva.program.v3";

export type SignInMethod = "email" | "phone";

export const PROGRAM_CATEGORIES = [
  "Cafe",
  "Retail",
  "Salon",
  "Gym",
  "Restaurant",
  "Other",
] as const;

export type ProgramCategory = (typeof PROGRAM_CATEGORIES)[number];

export type ProgramSnapshot = {
  signedIn: boolean;
  signInMethod: SignInMethod | null;
  walletReady: boolean;
  created: boolean;
  rulesSet: boolean;
  live: boolean;
  liveAt: string | null;
  businessName: string;
  category: ProgramCategory;
  location: string;
  approvers: string[];
  pointRate: number;
  cashbackPct: number;
  morningDouble: boolean;
  welcomeBonus: number;
  weeklyCap: number;
  funded: number;
  issued: number;
  usedRedeemCodes: string[];
  enrolledCodes: string[];
};

export const defaultSnapshot: ProgramSnapshot = {
  signedIn: false,
  signInMethod: null,
  walletReady: false,
  created: false,
  rulesSet: false,
  live: false,
  liveAt: null,
  businessName: "Bloom Coffee",
  category: "Cafe",
  location: "Al Quoz",
  approvers: ["rohit@bloomcoffee.ae", "ops@bloomcoffee.ae"],
  pointRate: 1,
  cashbackPct: 5,
  morningDouble: true,
  welcomeBonus: 200,
  weeklyCap: 2000,
  funded: 0,
  issued: 0,
  usedRedeemCodes: [],
  enrolledCodes: [],
};

export function loadProgram(): ProgramSnapshot {
  if (typeof window === "undefined") return defaultSnapshot;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSnapshot;
    return normalizeProgram({ ...defaultSnapshot, ...JSON.parse(raw) });
  } catch {
    return defaultSnapshot;
  }
}

export function saveProgram(next: ProgramSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useProgram() {
  const [state, setState] = useState<ProgramSnapshot>(defaultSnapshot);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadProgram());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<ProgramSnapshot>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveProgram(next);
      return next;
    });
  }, []);

  return { state, hydrated, update };
}

function normalizeProgram(raw: ProgramSnapshot & { approvers?: string[] | string }): ProgramSnapshot {
  const category = PROGRAM_CATEGORIES.includes(raw.category as ProgramCategory)
    ? (raw.category as ProgramCategory)
    : "Cafe";
  return {
    ...raw,
    category,
    approvers: approverList(raw.approvers),
  };
}

export function approverList(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function nextSetupHref(state: ProgramSnapshot): string {
  if (!state.created) return "/configure";
  if (state.funded <= 0) return "/reserve/fund";
  if (!state.live) return "/configure";
  return "/dashboard";
}

export function formatLiveDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function earningRules(state: ProgramSnapshot) {
  const earn = [`Every purchase earns ${state.cashbackPct}% back in points`];
  if (state.morningDouble) earn.push("Double points before 11am, Sunday to Thursday");
  if (state.welcomeBonus > 0) {
    earn.push(`New customers get ${state.welcomeBonus} points when they join`);
  }
  return {
    earn,
    limits: [
      `No more than ${state.weeklyCap.toLocaleString()} points to one customer per week`,
    ],
  };
}

export function seedLiveProgram(state: ProgramSnapshot): Partial<ProgramSnapshot> | null {
  if (state.live && state.funded > 0) return null;
  return {
    signedIn: true,
    walletReady: true,
    created: true,
    rulesSet: true,
    live: true,
    liveAt: state.liveAt ?? new Date().toISOString(),
    businessName: "Bloom Coffee",
    category: "Cafe",
    location: "Al Quoz",
    approvers: ["rohit@bloomcoffee.ae", "ops@bloomcoffee.ae"],
    funded: 500,
    issued: 312.4,
    pointRate: 1,
    cashbackPct: 5,
    morningDouble: true,
    welcomeBonus: 200,
    weeklyCap: 2000,
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
