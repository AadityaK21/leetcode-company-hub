import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Difficulty } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HARD: "text-rose-600 dark:text-rose-400",
};

export const DIFFICULTY_BG: Record<Difficulty, string> = {
  EASY: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HARD: "bg-rose-500",
};

export function xpForDifficulty(d: Difficulty): number {
  return d === "EASY" ? 10 : d === "MEDIUM" ? 25 : 50;
}

export function levelFromXp(xp: number): { level: number; current: number; next: number } {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floor = (level - 1) ** 2 * 100;
  const ceil = level ** 2 * 100;
  return { level, current: xp - floor, next: ceil - floor };
}
