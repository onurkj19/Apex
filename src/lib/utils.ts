import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumberWithDots(value: number | string, decimals = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `0.${'0'.repeat(decimals)}`;

  const fixed = Math.abs(numeric).toFixed(decimals);
  const [intPart, decimalPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = numeric < 0 ? '-' : '';
  return decimals > 0 ? `${sign}${grouped}.${decimalPart}` : `${sign}${grouped}`;
}

export function formatChf(value: number | string, decimals = 2) {
  return `${formatNumberWithDots(value, decimals)} CHF`;
}
