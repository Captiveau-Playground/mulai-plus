"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Phone,
  School,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const minWords = (min: number, msg: string) =>
  z.string().refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= min, msg);

const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;

const registrationSchema = z.object({
  name: z.string().min(1, "Nama lengkap wajib diisi"),
  class: z.enum(["10", "11", "12"], { message: "Pilih kelas" }),
  school: z.string().min(1, "Sekolah wajib diisi"),
  major: z.string().min(1, "Jurusan wajib dipilih"),
  province: z.string().min(1, "Provinsi wajib dipilih"),
  city: z.string().min(1, "Kota/Kabupaten wajib dipilih"),
  reason: minWords(10, "Motivasi minimal 10 kata"),
  phone: z.string().regex(phoneRegex, "Nomor WhatsApp tidak valid (contoh: 08123456789)"),
  email: z.string().email("Alamat email tidak valid"),
  reflectionIdealSelf: minWords(10, "Jawaban minimal 10 kata"),
  reflectionExpectation: minWords(10, "Jawaban minimal 10 kata"),
  reflectionFuture: minWords(10, "Jawaban minimal 10 kata"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface BatchType {
  id: string;
  name: string;
  status: string;
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  quota: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

interface ProgramRegistrationProps {
  programId: string;
  batch: BatchType;
  nextBatch?: BatchType;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    applied: { icon: Clock, bg: "bg-brand-orange/10", text: "text-brand-orange" },
    accepted: { icon: CheckCircle, bg: "bg-green-500/10", text: "text-green-600" },
    rejected: { icon: XCircle, bg: "bg-red-500/10", text: "text-red-600" },
  };

  const labelMap: Record<string, string> = {
    applied: "Menunggu Verifikasi",
    accepted: "Diterima",
    rejected: "Ditolak",
  };

  const { icon: Icon, bg, text } = config[status] || config.applied;

  return (
    <div className={cn("flex items-center gap-2 rounded-full px-4 py-2", bg)}>
      <Icon className={cn("h-4 w-4", text)} />
      <span className={cn("font-manrope font-medium text-sm", text)}>{labelMap[status] || status}</span>
    </div>
  );
}

const STEPS = [
  { id: 1, title: "Data Diri", icon: CalendarCheck },
  { id: 2, title: "Sekolah", icon: School },
  { id: 3, title: "Motivasi", icon: CalendarCheck },
  { id: 4, title: "Refleksi", icon: CheckCircle },
];

export function ProgramRegistration({ programId, batch, nextBatch }: ProgramRegistrationProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [regencies, setRegencies] = useState<{ id: string; name: string }[]>([]);

  const { data: applicationStatus, isLoading: isLoadingStatus } = useQuery(
    orpc.programs.student.checkApplication.queryOptions({
      input: {
        programId,
        batchId: batch.id,
      },
      enabled: !!session.data,
    }),
  );

  const applyMutation = useMutation(
    orpc.programs.apply.mutationOptions({
      onSuccess: () => {
        toast.success("Pendaftaran berhasil submitted!");
        setIsOpen(false);
        setCurrentStep(1);
        router.push("/dashboard/student/programs");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: session.data?.user.name || "",
      email: session.data?.user.email || "",
      class: "10",
      school: "",
      major: "",
      province: "",
      city: "",
      reason: "",
      phone: "",
      reflectionIdealSelf: "",
      reflectionExpectation: "",
      reflectionFuture: "",
    },
    mode: "onChange",
  });

  const watchedFields = form.watch();

  const handleLoginRedirect = () => {
    const callbackUrl = encodeURIComponent(window.location.pathname);
    router.push(`/login?callbackUrl=${callbackUrl}`);
  };

  const handleRegisterClick = () => {
    if (!session.data) {
      handleLoginRedirect();
      return;
    }
    setIsOpen(true);
    setCurrentStep(1);
  };

  const [regionData, setRegionData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && !regionData) {
      import("../../data/indonesia-regions.json").then((data) => {
        setRegionData(data);
        setProvinces(data.provinces);
      });
    }
  }, [isOpen, regionData]);

  const loadRegencies = (provinceName: string) => {
    if (!regionData) return;
    // Find province ID from name
    const province = regionData.provinces.find((p: { name: string }) => p.name === provinceName);
    if (province && regionData.regencies[province.id]) {
      setRegencies(regionData.regencies[province.id]);
    } else {
      setRegencies([]);
    }
  };

  const onSubmit = (values: RegistrationFormValues) => {
    applyMutation.mutate({
      programId,
      batchId: batch.id,
      answers: values,
    });
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const fields = getFieldsForStep(currentStep);
    return fields.every((field) => {
      const value = watchedFields[field as keyof RegistrationFormValues];
      return value?.toString().trim() !== "";
    });
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 1:
        return ["name", "email", "phone", "province", "city"];
      case 2:
        return ["school", "class", "major"];
      case 3:
        return ["reason"];
      case 4:
        return ["reflectionIdealSelf", "reflectionExpectation", "reflectionFuture"];
      default:
        return [];
    }
  };

  const isRegistrationOpen =
    batch.status === "open" &&
    new Date() >= new Date(batch.registrationStartDate) &&
    new Date() <= new Date(batch.registrationEndDate);

  const getButtonState = () => {
    switch (batch.status) {
      case "open":
        return isRegistrationOpen
          ? { label: "Daftar Sekarang", disabled: false, icon: CalendarCheck }
          : { label: "Pendaftaran Ditutup", disabled: true, icon: CalendarCheck };
      case "upcoming":
        return { label: "Segera Hadir", disabled: true, icon: CalendarCheck };
      case "running":
        return { label: "Program Berlangsung", disabled: true, icon: CalendarCheck };
      case "closed":
        return { label: "Pendaftaran Ditutup", disabled: true, icon: CalendarCheck };
      case "completed":
        return { label: "Program Selesai", disabled: true, icon: CalendarCheck };
      default:
        return { label: "Pendaftaran Ditutup", disabled: true, icon: CalendarCheck };
    }
  };

  const buttonState = getButtonState();

  if (batch.status === "closed" || batch.status === "completed" || batch.status === "running") {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="font-manrope text-sm text-text-muted-custom">{buttonState.label}</p>
      </div>
    );
  }

  if (!session.data) {
    return (
      <Button className="btn-brand-navy w-full shadow-md" size="lg" onClick={handleLoginRedirect}>
        <CalendarCheck className="mr-2 h-5 w-5" />
        Masuk untuk Mendaftar
      </Button>
    );
  }

  if (session.data && isLoadingStatus) {
    return (
      <Button className="btn-brand-navy w-full" size="lg" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memeriksa status...
      </Button>
    );
  }

  if (applicationStatus?.hasApplied) {
    const status = applicationStatus.status ?? "applied";

    if (status === "accepted") {
      return (
        <div className="w-full rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {/* Title */}
          <h4 className="mb-1 font-bricolage font-semibold text-base text-green-700">Selamat! Kamu Diterima</h4>
          {/* Message */}
          <p className="mb-5 font-manrope text-green-600/80 text-sm">
            Kamu telah diterima di {batch.name}. Yuk lihat detail program di dashboard!
          </p>
          {/* CTA Button */}
          <Button
            className="btn-brand-navy flex w-full items-center gap-2 rounded-full px-6 font-bold font-manrope shadow-md"
            size="lg"
            onClick={() => router.push("/dashboard/student/programs")}
          >
            <CheckCircle className="h-5 w-5" />
            Ke Dashboard Student
          </Button>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          {/* Title */}
          <h4 className="mb-1 font-bricolage font-semibold text-base text-red-700">Pendaftaran Ditolak</h4>
          {/* Message */}
          <p className="mb-5 font-manrope text-red-600/80 text-sm">
            Maaf, pendaftaran kamu untuk {batch.name} belum diterima.
            {nextBatch
              ? ` Kamu bisa mendaftar di ${nextBatch.name} yang akan datang.`
              : " Silakan coba di batch selanjutnya."}
          </p>
          {/* CTA Button */}
          {nextBatch ? (
            <Button
              className="btn-brand-navy flex w-full items-center gap-2 rounded-full px-6 font-bold font-manrope shadow-md"
              size="lg"
              onClick={() => {
                router.refresh();
              }}
            >
              <CalendarCheck className="h-5 w-5" />
              Daftar {nextBatch.name}
            </Button>
          ) : (
            <p className="text-center font-manrope text-red-500/60 text-xs">
              Belum ada batch selanjutnya yang tersedia.
            </p>
          )}
        </div>
      );
    }

    // Default: applied / pending status (menggunakan design system brand-navy)
    return (
      <div className="w-full rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4">
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge status={status} />
        </div>
        <p className="text-center font-manrope text-sm text-text-muted-custom">
          Kamu sudah mendaftar di {batch.name}, mohon tunggu hasil verifikasi.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        className="btn-brand-navy w-full shadow-md"
        size="lg"
        onClick={handleRegisterClick}
        disabled={buttonState.disabled}
      >
        {(() => {
          const Icon = buttonState.icon;
          return <Icon className="mr-2 h-5 w-5" />;
        })()}
        {buttonState.label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-[640px]">
          <div className="gradient-brand-navy px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-bricolage text-brand-orange text-xl">Pendaftaran {batch.name}</CardTitle>
                <CardDescription className="mt-1 font-manrope text-sm text-white/70">
                  Lengkapi data di bawah untuk mengajukan pendaftaran
                </CardDescription>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                          isCompleted && "border-white bg-white",
                          isCurrent && "border-brand-orange bg-brand-orange",
                          !isCompleted && !isCurrent && "border-white/30 bg-transparent",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-brand-navy" />
                        ) : (
                          <Icon className={cn("h-5 w-5", isCurrent ? "text-white" : "text-white/50")} />
                        )}
                      </div>
                      <span
                        className={cn(
                          "mt-2 font-medium text-xs",
                          isCurrent ? "text-white" : isCompleted ? "text-white/80" : "text-white/40",
                        )}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-2 h-0.5 flex-1 rounded-full",
                          currentStep > step.id ? "bg-white" : "bg-white/30",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <CardContent className="bg-white px-6 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {currentStep === 1 && (
                  <div className="fade-in slide-in-from-right-4 animate-in space-y-4 duration-300">
                    <h4 className="font-bricolage font-semibold text-base text-brand-navy">Informasi Personal</h4>
                    <p className="font-manrope text-sm text-text-muted-custom">
                      Silakan masukkan data diri Anda dengan lengkap
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Nama Lengkap</FormLabel>
                            <FormControl>
                              <Input placeholder="Masukkan nama lengkap" className="student-input" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@contoh.com" className="student-input" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1 font-manrope text-sm text-text-main">
                              <Phone className="h-3 w-3 text-text-muted-custom" />
                              No. WhatsApp
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="08123456789" className="student-input" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1 font-manrope text-sm text-text-main">
                              <MapPin className="h-3 w-3 text-text-muted-custom" />
                              Provinsi
                            </FormLabel>
                            <Select
                              onValueChange={(value) => {
                                if (typeof value === "string" && value) {
                                  field.onChange(value);
                                  setRegencies([]);
                                  form.setValue("city", "");
                                  loadRegencies(value);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="student-input">
                                  <SelectValue placeholder="Pilih provinsi" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {provinces.map((p) => (
                                  <SelectItem key={p.id} value={p.name} className="font-manrope text-sm">
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Kota/Kabupaten</FormLabel>
                            <Select onValueChange={field.onChange} disabled={!watchedFields.province}>
                              <FormControl>
                                <SelectTrigger className="student-input">
                                  <SelectValue
                                    placeholder={
                                      !watchedFields.province ? "Pilih provinsi dulu" : "Pilih kota/kabupaten"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regencies.map((r) => (
                                  <SelectItem key={r.id} value={r.name} className="font-manrope text-sm">
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="fade-in slide-in-from-right-4 animate-in space-y-4 duration-300">
                    <h4 className="font-bricolage font-semibold text-base text-brand-navy">Informasi Sekolah</h4>
                    <p className="font-manrope text-sm text-text-muted-custom">
                      Berikan informasi tentang sekolah dan jenjang pendidikan Anda
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="school"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Sekolah</FormLabel>
                            <FormControl>
                              <Input placeholder="SMA Negeri 1 Jakarta" className="student-input" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="class"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Kelas</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="student-input">
                                  <SelectValue placeholder="Pilih kelas" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="10" className="font-manrope text-sm">
                                  Kelas 10
                                </SelectItem>
                                <SelectItem value="11" className="font-manrope text-sm">
                                  Kelas 11
                                </SelectItem>
                                <SelectItem value="12" className="font-manrope text-sm">
                                  Kelas 12
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="major"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-manrope text-sm text-text-main">Jurusan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="student-input">
                                <SelectValue placeholder="Pilihjurusan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IPA" className="font-manrope text-sm">
                                IPA (Sains)
                              </SelectItem>
                              <SelectItem value="IPS" className="font-manrope text-sm">
                                IPS (Sosial)
                              </SelectItem>
                              <SelectItem value="Lainnya" className="font-manrope text-sm">
                                Lainnya
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="font-manrope text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="fade-in slide-in-from-right-4 animate-in space-y-4 duration-300">
                    <h4 className="font-bricolage font-semibold text-base text-brand-navy">Motivasi</h4>
                    <p className="font-manrope text-sm text-text-muted-custom">
                      Ceritakan mengapa Anda tertarik mengikuti program ini
                    </p>

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-manrope text-sm text-text-main">
                            Alasan Mengikuti Program
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Jelaskan motivasi dan harapan Anda mengikuti program MULAI+..."
                              className="student-textarea min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="font-manrope text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="fade-in slide-in-from-right-4 animate-in space-y-5 duration-300">
                    <div>
                      <h4 className="font-bricolage font-semibold text-base text-brand-navy">Refleksi & Komitmen</h4>
                      <p className="font-manrope text-sm text-text-muted-custom">
                        Jawab dengan jujur dan mendalam untuk membantu kami memahami Anda lebih baik
                      </p>
                    </div>

                    <div className="max-h-[calc(100vh-350px)] space-y-4 overflow-y-auto rounded-xl bg-gradient-to-br from-brand-orange/5 to-amber-50 p-4 sm:max-h-none sm:overflow-visible">
                      <FormField
                        control={form.control}
                        name="reflectionIdealSelf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">
                              <span className="mr-1 font-semibold text-brand-orange">1.</span>
                              Kalau dunia nggak nuntut apapun dari kamu, kamu pengen jadi orang yang kayak gimana?
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Pikirkan tentang nilai, karakter, dan hal-hal yang ingin kamu wujudkan tanpa tekanan eksternal..."
                                className="student-textarea min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reflectionExpectation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">
                              <span className="mr-1 font-semibold text-brand-orange">2.</span>
                              Apa yang kamu harapkan dari pendampingan seperti MULAI+?
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tuliskan harapan, tujuan, atau hal spesifik yang ingin kamu dapat dari program ini..."
                                className="student-textarea min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reflectionFuture"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">
                              <span className="mr-1 font-semibold text-brand-orange">3.</span>
                              Sejauh apa/apa saja rencana masa depan yang sudah kamu obrolin bareng orang lain?
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Ceritakan tentang mimpi, rencana pendidikan, atau tujuan hidup..."
                                className="student-textarea min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="flex items-center gap-2 rounded-full border-gray-200 px-5 font-manrope"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Kembali
                    </Button>
                  )}
                  <div className="flex-1" />
                  {currentStep < STEPS.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="btn-brand-navy flex items-center gap-2 rounded-full px-6 font-manrope"
                    >
                      Lanjut
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={applyMutation.isPending}
                      className="btn-brand-navy flex items-center gap-2 rounded-full px-6 font-manrope"
                    >
                      {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kirim Pendaftaran
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </DialogContent>
      </Dialog>
    </>
  );
}
