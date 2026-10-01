"use client";

import { CalendarClock, Loader2, Mail, Power, ShieldAlert, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

interface Status {
  active: boolean;
  endsAt?: string | null;
  message?: string | null;
  via?: string;
}

export default function AdminMaintenancePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.maintenance
      .get()
      .then((s: any) => {
        setStatus(s);
        if (s?.endsAt) setEndsAt(toLocalInput(new Date(s.endsAt)));
        if (s?.message) setMessage(s.message);
      })
      .catch(() => setStatus({ active: false }));
  }, []);

  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const persist = async (active: boolean) => {
    setBusy(true);
    try {
      const result = await client.maintenance.set({
        active,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        message: message.trim() || null,
      });
      setStatus(result as any);
      notify.create(active ? "Maintenance AKTIF 🔧" : "Maintenance dimatikan ✅", {
        description: active
          ? "Dashboard non-admin di-gate & email blast dikirim ke semua user."
          : "Semua fitur kembali normal.",
      });
    } catch (e) {
      notify.error("Gagal menyimpan", { description: (e as Error)?.message?.slice(0, 140) });
    } finally {
      setBusy(false);
    }
  };

  const active = status?.active === true;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            <Wrench className="h-5 w-5 text-brand-navy" /> Mode Maintenance
          </h1>
          <p className="mt-1 font-manrope text-sm text-muted-foreground">
            Aktifkan saat update besar — dashboard non-admin menampilkan info maintenance; halaman depan tetap jalan.
          </p>
        </div>
        <Badge variant={active ? "destructive" : "default"} className="px-3 py-1">
          {busy ? "Menyimpan…" : active ? "● MAINTENANCE AKTIF" : "Normal"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-manrope text-xs font-semibold text-foreground">Estimasi selesai</label>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="pl-9"
                  disabled={busy}
                />
              </div>
              <p className="mt-1 font-manrope text-[11px] text-muted-foreground">
                Ditampilkan di kartu maintenance & email blast ("Estimasi selesai: …").
              </p>
            </div>
            <div>
              <label className="mb-1 block font-manrope text-xs font-semibold text-foreground">
                Pesan singkat (opsional)
              </label>
              <Input
                placeholder="cth: Pembaruan sistem besar — sebentar lagi kembali normal"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => persist(!active)}
              disabled={busy}
              className={active ? "bg-foreground hover:bg-foreground/80" : "bg-brand-orange hover:bg-brand-orange/90"}
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Power className="mr-1 h-4 w-4" />}
              {active ? "Matikan Maintenance" : "Aktifkan Maintenance"}
            </Button>
            {active && (
              <Button variant="outline" onClick={() => client.maintenance.get().then((s: any) => setStatus(s))}>
                Segarkan status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-brand-orange" /> Yang terjadi saat maintenance aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-manrope text-sm text-muted-foreground">
          <p>✅ Semua dashboard non-admin (siswa, mentor, program manager) menampilkan kartu maintenance.</p>
          <p>✅ Halaman depan (hero, explore, blog, landing) tetap 100% jalan.</p>
          <p>✅ /admin/* tetap terbuka untuk kamu (kontrol ini).</p>
          <p>
            <Mail className="mr-1 inline h-3.5 w-3.5 text-brand-navy" />
            Email notifikasi dikirim ke <b>seluruh user</b> (estimasi + kontak support) saat diaktifkan.
          </p>
          <p className="text-[11px]">Status saat ini: {status?.via === "secret" ? "via secret (env)" : status?.via === "kv" ? "via toggle ini (KV)" : "nonaktif"}.</p>
        </CardContent>
      </Card>
    </div>
  );
}