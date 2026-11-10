"use client";

import { cn } from "@/lib/utils";
import { ProgramRegistration } from "../program-registration";

interface Batch {
  id: string;
  name: string;
  status: string;
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  quota: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface RegistrationCTAProps {
  programId: string;
  batch: Batch;
  allBatches?: Batch[];
  className?: string;
}

export function RegistrationCTA({ programId, batch, allBatches, className }: RegistrationCTAProps) {
  // Find the next available batch (open/upcoming) that is different from current batch
  const nextBatch = allBatches?.find((b) => b.id !== batch.id && (b.status === "open" || b.status === "upcoming"));
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-brand-navy p-6 md:p-8", className)}>
      <div className="relative flex w-full flex-col gap-8">
        <h2 className="heading-card text-white">Daftarkan Dirimu Sekarang Juga!</h2>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold font-bricolage text-lg text-white">{batch.name}</span>
            <span className="inline-flex items-center rounded-full bg-brand-orange px-3 py-1 font-manrope font-semibold text-brand-navy text-xs">
              {batch.status.toUpperCase()}
            </span>
          </div>

          <dl className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-manrope text-sm text-text-lighter-blue/80">Start</dt>
              <dd className="font-manrope font-medium text-sm text-white">{formatDate(batch.startDate)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="font-manrope text-sm text-text-lighter-blue/80">End</dt>
              <dd className="font-manrope font-medium text-sm text-white">{formatDate(batch.endDate)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="font-manrope text-sm text-text-lighter-blue/80">Registration</dt>
              <dd className="font-manrope font-medium text-sm text-white">
                {formatDate(batch.registrationStartDate)} - {formatDate(batch.registrationEndDate)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="font-manrope text-sm text-text-lighter-blue/80">Quota</dt>
              <dd className="font-manrope font-medium text-sm text-white">{batch.quota}</dd>
            </div>
          </dl>
        </div>

        <div className="h-px w-full bg-white/15" />

        <ProgramRegistration programId={programId} batch={batch} nextBatch={nextBatch} />
      </div>
    </div>
  );
}
