"use client";

import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type EventData, Joyride, STATUS, type Step, type TooltipRenderProps } from "react-joyride";

const STORAGE_KEY = "mulaiplus-student-onboarding-done";

const TOUR_STEPS: Step[] = [
  {
    target: "body",
    title: "Selamat Datang di MULAI+!",
    content: "Dashboard ini adalah pusat kendali kegiatan belajarmu. Yuk, kita lihat fitur-fitur utamanya!",
    placement: "center",
    skipBeacon: true,
  },
  {
    target: "#tour-stats",
    title: "Ringkasan Aktivitas",
    content: "Lihat sekilas jumlah program, kursus, sesi mendatang, dan pesananmu. Semua terpantau dari sini.",
    placement: "bottom",
  },
  {
    target: "#tour-quick-actions",
    title: "Aksi Cepat",
    content: "Akses cepat ke halaman Program, Kursus, dan Jadwal. Tinggal klik, langsung menuju ke halaman tujuan.",
    placement: "left",
  },
  {
    target: "#tour-sidebar",
    title: "Navigasi Sidebar",
    content:
      "Gunakan sidebar untuk berpindah antar halaman — Dashboard, Program, Kursus, Jadwal, Sertifikat, dan lainnya.",
    placement: "right",
  },
  {
    target: "#tour-applications",
    title: "Riwayat Pendaftaran",
    content:
      "Pantau status pendaftaran program mentoringmu di sini. Lihat apakah sudah diterima, ditolak, atau masih menunggu.",
    placement: "left",
  },
];

function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
      style={{ maxWidth: 380, width: "100%" }}
    >
      {/* Header accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1A1F6D] to-[#FE9114]" />

      {/* Step indicator + close */}
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="font-manrope font-medium text-[#FE9114] text-xs uppercase tracking-wider">
          Langkah {index + 1} dari {size}
        </span>
        <button
          type="button"
          onClick={closeProps.onClick}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title + content */}
      <div className="px-5 py-3">
        {step.title && <h3 className="mb-2 font-bold font-bricolage text-gray-900 text-lg">{step.title}</h3>}
        <div className="font-manrope text-gray-500 text-sm leading-relaxed">{step.content}</div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 px-5 pb-2">
        {Array.from({ length: size }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-[#1A1F6D]" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between border-gray-100 border-t px-5 py-3">
        <button
          type="button"
          onClick={skipProps.onClick}
          className="cursor-pointer rounded-full px-3 py-1.5 font-manrope text-gray-400 text-sm transition-colors hover:text-gray-600"
        >
          {skipProps.title}
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={backProps.onClick}
              className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 font-manrope text-gray-500 text-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Kembali
            </button>
          )}

          {continuous && (
            <button
              type="button"
              onClick={primaryProps.onClick}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1A1F6D] px-4 py-1.5 font-manrope font-semibold text-sm text-white shadow-md transition-all hover:bg-[#1A1F6D]/90"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Mulai Belajar!
                </>
              ) : (
                <>
                  Lanjut
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentOnboardingTour() {
  const [run, setRun] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      localStorage.setItem(STORAGE_KEY, "true");
      setRun(false);
    }
  }, []);

  if (!isMounted) return null;

  return (
    <Joyride
      onEvent={handleEvent}
      continuous
      run={run}
      steps={TOUR_STEPS}
      tooltipComponent={TourTooltip}
      options={{
        zIndex: 9999,
        overlayColor: "rgba(0, 0, 0, 0.5)",
        spotlightPadding: 8,
        overlayClickAction: false,
      }}
      styles={{
        overlay: {
          backdropFilter: "blur(2px)",
        },
        spotlight: {
          borderRadius: "12px",
        } as Record<string, string>,
      }}
      locale={{
        back: "Kembali",
        close: "Tutup",
        last: "Mulai Belajar!",
        next: "Lanjut",
        skip: "Skip",
      }}
    />
  );
}
