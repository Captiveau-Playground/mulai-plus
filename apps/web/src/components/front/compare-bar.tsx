"use client";

import { BarChart3 } from "lucide-react";

const COMPARE_KEY = "mulaiplus-compare";
const MAX_COMPARE = 5;

export function getCompareList(): { id: string; name: string }[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToCompare(id: string, name: string): boolean {
  const list = getCompareList().filter((i) => i.id !== id);
  if (list.length >= MAX_COMPARE) return false;
  list.push({ id, name });
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("compare-updated"));
  return true;
}

export function removeFromCompare(id: string) {
  const list = getCompareList().filter((i) => i.id !== id);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("compare-updated"));
}

export function isInCompare(id: string): boolean {
  return getCompareList().some((i) => i.id === id);
}

export function clearCompare() {
  localStorage.removeItem(COMPARE_KEY);
  window.dispatchEvent(new Event("compare-updated"));
}

export function CompareButton({ id, name, size = "sm" }: { id: string; name: string; size?: "sm" | "xs" }) {
  const inList = isInCompare(id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (inList) {
          removeFromCompare(id);
        } else {
          addToCompare(id, name);
        }
      }}
      className={`inline-flex items-center gap-1 rounded-lg border font-manrope transition-all ${
        inList
          ? "border-brand-navy/30 bg-brand-navy/10 text-brand-navy"
          : "border-gray-200 text-text-muted-custom hover:border-brand-navy/30 hover:text-brand-navy"
      }
        ${size === "xs" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}
      `}
    >
      <BarChart3 className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {inList ? "Dipilih" : "Bandingkan"}
    </button>
  );
}
