"use client";

import { env } from "@mulai-plus/env/web";
import { MessageSquare, Settings2, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/toast";

const AI_BASE = (env.NEXT_PUBLIC_SERVER_URL || "").replace(/\/$/, "");

type Trend = { d: string; messages: number; up: number; down: number };
type Feedback = {
  id: number;
  sessionId: string;
  feedback: string;
  question: string;
  isAuth: boolean;
  createdAt: string | null;
};

export default function ChatbotAnalyticsPage() {
  const [daily, setDaily] = useState<string>("");
  const [settings, setSettings] = useState<{ daily_quota: number | null; default_daily: number } | null>(null);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [hourly, setHourly] = useState<{ h: string; n: number }[]>([]);
  const [fb, setFb] = useState<{ up: number; down: number; data: Feedback[] } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [days, setDays] = useState("30");

  const load = useCallback(
    async (d = days) => {
      const j = async (p: string) => {
        try {
          const r = await fetch(`${AI_BASE}/ai/admin${p}`);
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      };
      const [s, t, h, f, st] = await Promise.all([
        j("/settings"),
        j(`/analytics/trend?days=${d}`),
        j("/analytics/hourly"),
        j("/feedback?limit=50"),
        j("/stats"),
      ]);
      if (s) {
        setSettings(s);
        const dv = s?.daily_quota ?? s?.default_daily ?? 40;
        if (typeof dv === "number") setDaily(String(dv));
      }
      if (t?.data) setTrend(t.data);
      if (h?.data) setHourly(h.data);
      if (f) setFb(f);
      if (st) setStats(st);
    },
    [days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const saveQuota = async () => {
    const n = Number(daily);
    if (!Number.isFinite(n)) {
      notify.error("Masukkan angka");
      return;
    }
    const r = await fetch(`${AI_BASE}/ai/admin/settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_quota: Math.round(n) }),
    });
    const d = await r.json();
    if (r.ok) {
      notify.success(`Kuota harian diset: ${d.daily_quota}${d.note ? ` (${d.note})` : ""}`);
      void load();
    } else notify.error(d.error || "Gagal simpan");
  };

  const fmt = (n: number) => (Number.isFinite(n) ? n : 0);
  const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Mul.ai — Admin Pengelolaan</h1>
          <p className="font-manrope text-muted-foreground text-sm">
            Chatbot widget digantikan asisten AI penuh. Monitoring usage, kuota, feedback &amp; tren di sini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={days}
            onValueChange={(v) => {
              if (v != null) setDays(v);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 hari</SelectItem>
              <SelectItem value="30">30 hari</SelectItem>
              <SelectItem value="90">90 hari</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            Muat ulang
          </Button>
        </div>
      </div>

      {/* Pengaturan Kuota */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-bricolage text-brand-navy">Kuota Harian per User (OLTP)</CardTitle>
          <Settings2 className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="daily-quota" className="font-manrope text-muted-foreground text-xs">
              Pertanyaan/hari (0 atau -1 = tanpa batas)
            </label>
            <Input
              id="daily-quota"
              type="number"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={() => void saveQuota()} className="bg-brand-navy text-white hover:bg-brand-navy-light">
            Simpan
          </Button>
          {settings && (
            <p className="font-manrope text-muted-foreground text-xs">
              Berlaku real-time · default kode {settings.default_daily} · yang disimpan:{" "}
              {settings.daily_quota ?? "belum ada (pakai default)"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <MessageSquare className="size-4 text-brand-navy" />
              <p className="mt-2 font-bold font-bricolage text-2xl text-brand-navy">{fmt(stats.total_messages)}</p>
              <p className="font-manrope text-muted-foreground text-xs">
                Total pesan · {fmt(stats.today_messages)} hari ini
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <TrendingUp className="size-4 text-brand-orange" />
              <p className="mt-2 font-bold font-bricolage text-2xl text-brand-navy">{fmt(stats.auth_sessions)}</p>
              <p className="font-manrope text-muted-foreground text-xs">
                Sesi user ({fmt(stats.guest_sessions)} guest)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <ThumbsUp className="size-4 text-emerald-600" />
              <p className="mt-2 font-bold font-bricolage text-2xl text-brand-navy">{fmt(fb?.up ?? 0)}</p>
              <p className="font-manrope text-muted-foreground text-xs">Feedback positif</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <ThumbsDown className="size-4 text-red-500" />
              <p className="mt-2 font-bold font-bricolage text-2xl text-brand-navy">{fmt(fb?.down ?? 0)}</p>
              <p className="font-manrope text-muted-foreground text-xs">Feedback negatif</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tren & jam-an */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-bricolage text-brand-navy text-sm">Tren Harian ({days} hari)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-orange)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand-orange)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={tooltipStyle} />
                <Area dataKey="messages" name="Pesan" stroke="var(--brand-orange)" fill="url(#gMsg)" strokeWidth={2} />
                <Area dataKey="up" name="👍" stroke="#16a34a" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                <Area dataKey="down" name="👎" stroke="#dc2626" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-bricolage text-brand-navy text-sm">Jam Sibuk (24 jam)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <XAxis dataKey="h" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="n" name="Pesan" fill="var(--brand-navy)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feedback terbaru */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-bricolage text-brand-navy text-sm">Feedback Terbaru</CardTitle>
          <div className="flex items-center gap-2 font-manrope text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3.5 text-emerald-600" /> {fmt(fb?.up ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="size-3.5 text-red-500" /> {fmt(fb?.down ?? 0)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!fb?.data?.length && <p className="font-manrope text-muted-foreground text-sm">Belum ada feedback.</p>}
          {fb?.data.map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              {row.feedback === "up" ? (
                <ThumbsUp className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <ThumbsDown className="size-4 shrink-0 text-red-500" />
              )}
              <span className="min-w-0 flex-1 truncate font-manrope text-xs">
                {row.question || "(tanpa pertanyaan)"}
              </span>
              {row.isAuth && (
                <Badge variant="secondary" className="shrink-0">
                  auth
                </Badge>
              )}
              <span className="shrink-0 font-manrope text-[10px] text-muted-foreground">
                {row.createdAt?.slice(0, 10) ?? ""}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
