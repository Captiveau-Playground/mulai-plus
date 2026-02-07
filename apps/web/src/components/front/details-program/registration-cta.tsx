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
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-12 rounded-[20px] bg-white p-4 shadow-[0px_4px_40px_rgba(0,0,0,0.08)] md:p-6",
        className,
      )}
    >
      {/* Content */}
      <div className="flex flex-col gap-6">
        {/* Headline */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-inter text-2xl text-[#1A1F6D] leading-[1.2]">{batchName}</h3>
          <div className="flex items-center justify-center rounded-lg bg-[#FFF2F2] px-6 py-[10px]">
            <span className="font-inter font-semibold text-[#F93447] text-base leading-[1.2]">{status}</span>
          </div>
        </div>

        {/* Detail Info */}
        <div className="flex flex-col gap-4">
          {/* Start */}
          <div className="flex items-center justify-between">
            <span className="font-inter font-normal text-[#6D6D6D] text-base leading-[1.2]">Start</span>
            <span className="text-right font-inter font-medium text-base text-black leading-[1.2]">{startDate}</span>
          </div>

          {/* End */}
          <div className="flex items-center justify-between">
            <span className="font-inter font-normal text-[#6D6D6D] text-base leading-[1.2]">End</span>
            <span className="text-right font-inter font-medium text-base text-black leading-[1.2]">{endDate}</span>
          </div>

          {/* Registration Date */}
          <div className="flex items-center justify-between">
            <span className="font-inter font-normal text-[#6D6D6D] text-base leading-[1.2]">Registration</span>
            <span className="text-right font-inter font-medium text-base text-black leading-[1.2]">
              {registrationDate}
            </span>
          </div>

          {/* Quota */}
          <div className="flex items-center justify-between">
            <span className="font-inter font-normal text-[#6D6D6D] text-base leading-[1.2]">Quota</span>
            <span className="text-right font-inter font-medium text-base text-black leading-[1.2]">{quota}</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <Link
        href={registrationLink as any}
        className="flex w-full items-center justify-center rounded-lg bg-[#1A1F6D] px-[10px] py-6 transition-colors hover:bg-[#1A1F6D]/90"
      >
        <span className="font-inter font-semibold text-2xl text-white leading-[1.2] tracking-[-0.05em]">
          Daftar Sekarang
        </span>
      </Link>
    </div>
  );
}
