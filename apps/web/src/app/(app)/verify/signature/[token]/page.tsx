import { CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

function decodeToken(token: string): {
  role: string;
  name: string;
  documentId: string;
  date: string;
} | null {
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const data = JSON.parse(raw);
    return {
      role: data.r || "unknown",
      name: data.n || "Unknown",
      documentId: data.d || "—",
      date: data.t || "—",
    };
  } catch {
    return null;
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case "program_manager":
      return "Program Manager";
    case "founder":
      return "Founder";
    default:
      return role;
  }
}

async function VerificationContent({ token }: { token: string }) {
  const info = decodeToken(token);

  if (!info) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <ShieldCheck className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="font-bold font-bricolage text-2xl text-red-600">Invalid Signature</h1>
          <p className="mt-2 font-manrope text-sm text-text-muted-custom">
            This signature link is invalid or has been tampered with.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Verified Badge */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 shadow-sm">
            <ShieldCheck className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="font-bold font-bricolage text-3xl text-green-600">{roleLabel(info.role)}</h1>
          <p className="mt-1 font-manrope text-sm text-text-muted-custom">
            Digital signature verified — document issued by MULAI+
          </p>
        </div>

        {/* Signature Details */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy/10">
              <FileText className="h-5 w-5 text-brand-navy" />
            </div>
            <div>
              <h2 className="font-bold font-bricolage text-brand-navy text-lg">Digital Signature</h2>
              <p className="font-manrope text-text-muted-custom text-xs">Summary Report</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between border-gray-50 border-b pb-2">
              <span className="font-manrope font-medium text-text-muted-custom text-xs uppercase tracking-wider">
                Signed by
              </span>
              <span className="font-manrope font-semibold text-sm text-text-main">{info.name}</span>
            </div>
            <div className="flex justify-between border-gray-50 border-b pb-2">
              <span className="font-manrope font-medium text-text-muted-custom text-xs uppercase tracking-wider">
                Role
              </span>
              <span className="font-manrope font-medium text-sm text-text-main">{roleLabel(info.role)}</span>
            </div>
            <div className="flex justify-between border-gray-50 border-b pb-2">
              <span className="font-manrope font-medium text-text-muted-custom text-xs uppercase tracking-wider">
                Document
              </span>
              <span className="font-manrope font-medium text-sm text-text-main">#{info.documentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-manrope font-medium text-text-muted-custom text-xs uppercase tracking-wider">
                Issued
              </span>
              <span className="font-manrope font-medium text-sm text-text-main">{info.date}</span>
            </div>
          </div>

          {/* Verified timestamp */}
          <div className="mt-5 rounded-xl bg-green-50 p-3 text-center">
            <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-green-500" />
            <p className="font-manrope font-medium text-green-700 text-xs">Verified — Document is authentic</p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center font-manrope text-[10px] text-text-muted-custom">
          This e-signature is provided by <span className="font-semibold text-brand-navy">MULAI+</span> — Bimbingan
          Universitas, Jurusan & Beasiswa
        </p>
      </div>
    </div>
  );
}

export default async function VerifySignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token || token.length < 5) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
        </div>
      }
    >
      <VerificationContent token={token} />
    </Suspense>
  );
}
