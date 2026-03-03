import Link from "next/link";
import { cn } from "@/lib/utils";

interface RegistrationCTAProps {
  batchName?: string;
  status?: "OPEN" | "CLOSED" | "COMING SOON";
  startDate?: string;
  endDate?: string;
  registrationDate?: string;
  quota?: number;
  registrationLink?: string;
  className?: string;
}

export function RegistrationCTA({
  batchName = "BATCH 1",
  status = "OPEN",
  startDate = "30 Mar 2026",
  endDate = "08 Mei 2026",
  registrationDate = "20 Feb 2026",
  quota = 10,
  registrationLink = "#",
  className,
}: RegistrationCTAProps) {
  const isDisabled = status !== "OPEN";
  const buttonLabel =
    status === "OPEN" ? "Daftar Sekarang" : status === "COMING SOON" ? "Coming Soon" : "Pendaftaran Tutup";

  return (
    <div className={cn("relative w-full overflow-hidden rounded-bl-[64px] bg-[#1A1F6D] p-10 md:p-12", className)}>
      {/* <div className="pointer-events-none absolute left-0 top-[292px] h-[360px] w-[576px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_55%),radial-gradient(circle_at_60%_60%,rgba(249,52,71,0.35)_0%,rgba(249,52,71,0)_60%),radial-gradient(circle_at_80%_25%,rgba(254,145,20,0.35)_0%,rgba(254,145,20,0)_60%)]" /> */}

      <div className="relative flex w-full flex-col gap-12">
        <h3 className="font-inter font-semibold text-3xl text-white tracking-[-0.05em]">
          Daftarkan Dirimu Sekarang Juga!
        </h3>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="font-bold font-inter text-2xl text-white">{batchName}</span>
            <div className="flex items-center justify-center rounded-lg bg-[#F93447] px-6 py-[10px]">
              <span className="font-manrope font-semibold text-base text-white">{status}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Start</span>
              <span className="font-manrope font-medium text-base text-white">{startDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">End</span>
              <span className="font-manrope font-medium text-base text-white">{endDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Registration</span>
              <span className="font-manrope font-medium text-base text-white">{registrationDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-inter font-normal text-[#BFD6FF] text-base">Quota</span>
              <span className="font-manrope font-medium text-base text-white">{quota}</span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-[#BFD6FF]" />

        <Link
          href={isDisabled ? "#" : (registrationLink as any)}
          className={cn(
            "flex w-full items-center justify-center rounded-2xl bg-white px-[10px] py-6",
            isDisabled && "pointer-events-none opacity-60",
          )}
          aria-disabled={isDisabled}
          onClick={(e) => isDisabled && e.preventDefault()}
        >
          <span className="font-inter font-semibold text-2xl text-[#1A1F6D] tracking-[-0.05em]">{buttonLabel}</span>
        </Link>
      </div>
    </div>
  );
}
