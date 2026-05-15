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
    <div className={cn("relative w-full overflow-hidden rounded-bl-[64px] bg-[#1A1F6D] p-10 md:p-12", className)}>
      <div className="relative flex w-full flex-col gap-12">
        <h3 className="font-inter font-semibold text-3xl text-white tracking-[-0.05em]">
          Daftarkan Dirimu Sekarang Juga!
        </h3>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="font-bold font-inter text-2xl text-white">{batch.name}</span>
            <div className="flex items-center justify-center rounded-lg bg-[#F93447] px-6 py-[10px]">
              <span className="font-manrope font-semibold text-base text-white">{batch.status.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Start</span>
              <span className="font-manrope font-medium text-base text-white">{formatDate(batch.startDate)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">End</span>
              <span className="font-manrope font-medium text-base text-white">{formatDate(batch.endDate)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Registration</span>
              <span className="font-manrope font-medium text-base text-white">
                {formatDate(batch.registrationStartDate)} - {formatDate(batch.registrationEndDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Quota</span>
              <span className="font-manrope font-medium text-base text-white">{batch.quota}</span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-[#BFD6FF]" />

        <ProgramRegistration programId={programId} batch={batch} nextBatch={nextBatch} />
      </div>
    </div>
  );
}
