export const DAILY_LIMIT_USD = 100;
export const DAILY_CAP_USD = 400;
export const TELEGRAM_BOT_URL = "https://t.me/reserva_bot";
export const TELEGRAM_HANDLE = "@reserva_bot";
export const DEMO_WALLET = "0x7a1c4e8b7d2f1a06e9c4b8f2a71d0e54f9E";
export const MERCHANT_NAME = "Bloom Coffee";
export const MERCHANT_LOCATION = "Al Quoz";
export const POINTS_PER_USDC = 100;

export function formatUsd(amount: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatPoints(points: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(points));
}

export function truncateAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
