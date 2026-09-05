import type { ProgramCategory, ProgramSnapshot } from "@/lib/program";

const WEEKLY_SPEND: Record<ProgramCategory, number> = {
  Cafe: 1400,
  Retail: 2200,
  Salon: 1100,
  Gym: 1300,
  Restaurant: 2800,
  Other: 1500,
};

const WEEKLY_JOINERS: Record<ProgramCategory, number> = {
  Cafe: 6,
  Retail: 8,
  Salon: 4,
  Gym: 5,
  Restaurant: 10,
  Other: 5,
};

export type ForecastWeek = {
  label: string;
  promised: number;
  remaining: number;
  sales: number;
  paused: boolean;
};

export type ProgramInsight = {
  title: string;
  body: string;
  tone: "ok" | "hold" | "no";
};

export function weeklySpend(state: ProgramSnapshot) {
  return WEEKLY_SPEND[state.category] ?? WEEKLY_SPEND.Other;
}

export function weeklyJoiners(state: ProgramSnapshot) {
  return WEEKLY_JOINERS[state.category] ?? WEEKLY_JOINERS.Other;
}

export function weeklyBurn(state: ProgramSnapshot) {
  let burn = weeklySpend(state) * (state.cashbackPct / 100);
  if (state.morningDouble) burn *= 1.22;
  if (state.welcomeBonus > 0) {
    burn += (state.welcomeBonus / 100) * weeklyJoiners(state);
  }
  if (state.issued > 40) {
    burn = Math.max(burn, state.issued * 0.22);
  }
  return Math.round(burn * 100) / 100;
}

export function freeReserve(state: ProgramSnapshot) {
  return Math.max(state.funded - state.issued, 0);
}

export function effectiveCashbackRate(state: ProgramSnapshot) {
  const rate = state.cashbackPct / 100;
  if (rate <= 0) return 0;
  return state.morningDouble ? rate * 1.22 : rate;
}

export function salesFromReserve(state: ProgramSnapshot) {
  const rate = effectiveCashbackRate(state);
  const weekly = weeklySpend(state);
  if (rate <= 0) {
    return { total: 0, remaining: 0, weekly };
  }
  return {
    total: state.funded / rate,
    remaining: freeReserve(state) / rate,
    weekly,
  };
}

export function runwayWeeks(state: ProgramSnapshot) {
  const burn = weeklyBurn(state);
  const free = freeReserve(state);
  if (burn <= 0) return Infinity;
  return Math.round((free / burn) * 10) / 10;
}

export function forecastWeeks(state: ProgramSnapshot, count = 8): ForecastWeek[] {
  const burn = weeklyBurn(state);
  const weekly = weeklySpend(state);
  let remaining = freeReserve(state);
  let promised = state.issued;
  const start = new Date();
  start.setDate(start.getDate() - start.getDay() + 1);

  return Array.from({ length: count }, (_, i) => {
    const week = new Date(start);
    week.setDate(start.getDate() + i * 7);
    const label = week.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const paused = remaining <= 0;
    const take = paused ? 0 : Math.min(burn, remaining);
    const sales = paused ? 0 : weekly * (take / Math.max(burn, 0.01));
    promised += take;
    remaining = Math.max(remaining - take, 0);
    return { label, promised, remaining, sales, paused };
  });
}

export function programInsights(state: ProgramSnapshot): ProgramInsight[] {
  const burn = weeklyBurn(state);
  const weeks = runwayWeeks(state);
  const free = freeReserve(state);
  const joiners = weeklyJoiners(state);
  const welcomeCost = (state.welcomeBonus / 100) * joiners;
  const items: ProgramInsight[] = [];

  if (state.issued === 0) {
    items.push({
      tone: "ok",
      title: "Forecast is based on a typical shop like yours",
      body: `Nothing is promised yet. Reserva is using about ${weeklySpend(state).toLocaleString()} USDC of weekly ${state.category.toLowerCase()} spend to project the next eight weeks.`,
    });
  }

  if (weeks === Infinity) {
    items.push({
      tone: "ok",
      title: "The reserve is not being spent",
      body: "Add earning rules or go live before a runway can be estimated.",
    });
    return items;
  }

  if (weeks < 2) {
    items.push({
      tone: "no",
      title: "The reserve will be fully promised within two weeks",
      body: `At ${burn.toFixed(0)} USDC a week, issuing pauses unless you add money. Customers can still redeem what they already have.`,
    });
  } else if (weeks < 5) {
    items.push({
      tone: "hold",
      title: `About ${weeks} weeks of runway left`,
      body: `${free.toFixed(0)} USDC is still free. Top up before week ${Math.ceil(weeks)} if you want the offer to stay on.`,
    });
  } else {
    items.push({
      tone: "ok",
      title: `The reserve covers about ${weeks} weeks`,
      body: `At your current rules, ${burn.toFixed(0)} USDC is promised each week. That is a comfortable gap — you can leave the offer running.`,
    });
  }

  const sales = salesFromReserve(state);
  items.push({
    tone: "ok",
    title: `This reserve can carry about ${Math.round(sales.total).toLocaleString()} USDC of sales`,
    body: `At ${state.cashbackPct}% back${state.morningDouble ? ", including morning double" : ""}, ${state.funded.toFixed(0)} USDC set aside covers that much customer spend. ${Math.round(sales.remaining).toLocaleString()} USDC of sales is still free.`,
  });

  if (state.morningDouble) {
    items.push({
      tone: "hold",
      title: "Morning double points is the expensive rule",
      body: "Turning it off would stretch the reserve by about a fifth. Ask the bot if the mornings are actually bringing extra tickets.",
    });
  }

  if (state.welcomeBonus > 0) {
    items.push({
      tone: "ok",
      title: `Welcome bonus costs about ${welcomeCost.toFixed(0)} USDC a week`,
      body: `${joiners} new members a week at ${state.welcomeBonus} points each. Cheap if they come back; cap it if a campaign is about to spike joins.`,
    });
  }

  if (state.funded > 0 && state.issued / state.funded >= 0.75) {
    items.push({
      tone: "hold",
      title: "More than three quarters of the reserve is already promised",
      body: "New points will stop the moment the last free dollar is issued. Add money before a busy weekend.",
    });
  }

  return items.slice(0, 5);
}
