"use client";

// Kontrol form untuk panel Aturan tes.
// Semua kontrol punya `data-testid="rule-<key>"` supaya test e2e stabil dan tidak bergantung styling.
import { CircleHelp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FieldBase {
  /** kunci config — dipakai untuk data-testid */
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

function LabelRow({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="flex items-center gap-1 font-manrope font-semibold text-foreground text-xs">
      {label}
      {hint && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label={`Info: ${label}`}
            className="inline-flex cursor-help items-center text-gray-400 transition-colors hover:text-brand-navy"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] leading-relaxed">{hint}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

export function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
  suffix,
  min = 0,
  max,
  placeholder,
}: FieldBase & {
  value: number | string;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className={cn("block", disabled && "opacity-60")} htmlFor={`f-${id}`}>
      <LabelRow label={label} hint={hint} />
      <span className="relative mt-1 flex items-center">
        <Input
          id={`f-${id}`}
          data-testid={`rule-${id}`}
          type="number"
          className="h-8 pr-10 text-xs"
          value={value}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 font-manrope text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function SwitchField({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  note,
}: FieldBase & { checked: boolean; onChange: (v: boolean) => void; note?: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-gray-100 bg-gray-50/40 px-3 py-2", disabled && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <LabelRow label={label} hint={hint} />
        <Switch
          data-testid={`rule-${id}`}
          size="sm"
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onChange(!!v)}
        />
      </div>
      {note && (
        <p
          data-testid={`note-${id}`}
          className="mt-1.5 flex flex-wrap items-center gap-1 font-manrope text-[10px] text-amber-700 leading-4"
        >
          {note}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
}: FieldBase & { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className={cn("block", disabled && "opacity-60")} htmlFor={`f-${id}`}>
      <LabelRow label={label} hint={hint} />
      <select
        id={`f-${id}`}
        data-testid={`rule-${id}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 font-manrope text-xs outline-none focus:border-brand-orange/50 disabled:bg-gray-50"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pilihan 2–4 opsi yang selalu terlihat (lebih cepat dipindai daripada dropdown). */
export function SegmentedField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
}: FieldBase & { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className={cn(disabled && "opacity-60")}>
      <LabelRow label={label} hint={hint} />
      <div
        data-testid={`rule-${id}`}
        className="mt-1 grid gap-1 rounded-lg bg-gray-100/70 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map(([v, l]) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              data-value={v}
              disabled={disabled}
              onClick={() => onChange(v)}
              className={cn(
                "rounded-md px-2 py-1.5 font-manrope font-semibold text-[11px] transition-all",
                active ? "bg-white text-brand-navy shadow-sm" : "text-gray-500 hover:text-gray-700",
              )}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Input teks dengan simpan debounce (700ms idle / blur). */
export function DebouncedInput({
  value,
  onCommit,
  idKey,
  className,
  placeholder,
  disabled,
  testId,
}: {
  value: string;
  onCommit: (v: string) => void;
  idKey?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setV(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = (val: string) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => onCommit(val), 700);
  };
  return (
    <Input
      disabled={disabled}
      data-testid={testId}
      className={className ?? ""}
      placeholder={placeholder}
      value={v}
      onChange={(e) => {
        const val = e.target.value;
        setV(val);
        commit(val);
      }}
      onBlur={() => {
        if (t.current) clearTimeout(t.current);
        onCommit(v);
      }}
    />
  );
}
