import { Calendar, Clock, Users } from "lucide-react";
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
  const isClosed = status === "CLOSED";
  const isComingSoon = status === "COMING SOON";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-8 rounded-[20px] bg-white p-6 shadow-[0px_4px_40px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-inter text-2xl text-[#1A1F6D] leading-[1.2]">{batchName}</h3>
          <div
            className={cn(
              "flex items-center justify-center rounded-lg px-4 py-2",
              status === "OPEN"
                ? "bg-[#E6F6E9] text-[#2E7D32]" // Green for Open
                : status === "COMING SOON"
                  ? "bg-[#FFF8E1] text-[#F57F17]" // Yellow for Coming Soon
                  : "bg-[#FFF2F2] text-[#F93447]", // Red for Closed
            )}
          >
            <span className="font-inter font-semibold text-sm leading-none tracking-wide">{status}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#E0E0E0]" />

        {/* Details */}
        <div className="flex flex-col gap-5">
          {/* Start Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#6D6D6D]">
              <Calendar className="h-5 w-5" />
              <span className="font-inter font-medium text-base">Mulai</span>
            </div>
            <span className="text-right font-inter font-semibold text-[#1A1F6D] text-base">{startDate}</span>
          </div>

          {/* End Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#6D6D6D]">
              <Clock className="h-5 w-5" />
              <span className="font-inter font-medium text-base">Selesai</span>
            </div>
            <span className="text-right font-inter font-semibold text-[#1A1F6D] text-base">{endDate}</span>
          </div>

          {/* Registration Deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#6D6D6D]">
              <Calendar className="h-5 w-5" />
              <span className="font-inter font-medium text-base">Batas Daftar</span>
            </div>
            <span className="text-right font-inter font-semibold text-[#1A1F6D] text-base">{registrationDate}</span>
          </div>

          {/* Quota */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#6D6D6D]">
              <Users className="h-5 w-5" />
              <span className="font-inter font-medium text-base">Kuota</span>
            </div>
            <span className="text-right font-inter font-semibold text-[#1A1F6D] text-base">{quota} Siswa</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <Link
        href={isClosed ? "#" : (registrationLink as any)}
        className={cn(
          "flex w-full items-center justify-center rounded-xl px-4 py-4 transition-all duration-300",
          isClosed
            ? "cursor-not-allowed bg-[#E0E0E0] text-[#888888]"
            : "bg-[#FE9114] text-white hover:bg-[#FE9114]/90 hover:shadow-lg",
        )}
        onClick={(e) => isClosed && e.preventDefault()}
      >
        <span className="font-bold font-inter text-lg leading-none tracking-wide">
          {isClosed ? "Pendaftaran Tutup" : isComingSoon ? "Segera Hadir" : "Daftar Sekarang"}
        </span>
      </Link>
    </div>
  );
}
