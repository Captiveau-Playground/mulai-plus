"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle, Clock, Loader2, MapPin, Phone, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const registrationSchema = z.object({
  name: z.string().min(1, "Nama lengkap wajib diisi"),
  class: z.string().min(1, "Kelas wajib diisi"),
  school: z.string().min(1, "Sekolah wajib diisi"),
  major: z.string().min(1, "Jurusan wajib dipilih"),
  domicile: z.string().min(1, "Kota domisili wajib diisi"),
  reason: z.string().min(1, "Alasan mengikuti program wajib diisi"),
  phone: z.string().min(1, "Nomor WhatsApp wajib diisi"),
  email: z.string().email("Alamat email tidak valid"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface ProgramRegistrationProps {
  programId: string;
  batch: {
    id: string;
    name: string;
    status: string;
    registrationStartDate: Date | string;
    registrationEndDate: Date | string;
    quota: number;
    startDate?: Date | string;
    endDate?: Date | string;
  };
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

export function ProgramRegistration({ programId, batch }: ProgramRegistrationProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);

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
      class: "",
      school: "",
      major: "",
      domicile: "",
      reason: "",
      phone: "",
    },
  });

  const handleRegisterClick = () => {
    if (!session.data) {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }
    setIsOpen(true);
  };

  const onSubmit = (values: RegistrationFormValues) => {
    applyMutation.mutate({
      programId,
      batchId: batch.id,
      answers: values,
    });
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

  if (session.data && isLoadingStatus) {
    return (
      <Button className="w-full bg-brand-navy font-semibold" size="lg" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memeriksa status...
      </Button>
    );
  }

  if (applicationStatus?.hasApplied) {
    return (
      <div className="w-full rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4">
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge status={applicationStatus.status} />
        </div>
        <p className="text-center font-manrope text-sm text-text-muted-custom">Kamu sudah terdaftar di batch ini</p>
      </div>
    );
  }

  return (
    <>
      <Button
        className="w-full bg-brand-navy font-semibold shadow-md hover:bg-brand-navy/90"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader className="mb-4">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy">
              <CalendarCheck className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="font-bold font-bricolage text-text-main text-xl">
              Pendaftaran Batch {batch.name}
            </DialogTitle>
            <DialogDescription className="font-manrope text-sm text-text-muted-custom">
              Lengkapi data di bawah untuk mengajukan pendaftaran program.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nama lengkap"
                          className="rounded-xl border-gray-200 bg-white font-manrope text-sm"
                          {...field}
                        />
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
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@contoh.com"
                          className="rounded-xl border-gray-200 bg-white font-manrope text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-manrope text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">No. WhatsApp</FormLabel>
                      <div className="relative">
                        <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted-custom" />
                        <FormControl>
                          <Input
                            placeholder="08xx..."
                            className="rounded-xl border-gray-200 bg-white pl-10 font-manrope text-sm"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="font-manrope text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="domicile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">Kota Domisili</FormLabel>
                      <div className="relative">
                        <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted-custom" />
                        <FormControl>
                          <Input
                            placeholder="Jakarta"
                            className="rounded-xl border-gray-200 bg-white pl-10 font-manrope text-sm"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="font-manrope text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">Sekolah</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SMA Negeri 1 Jakarta"
                          className="rounded-xl border-gray-200 bg-white font-manrope text-sm"
                          {...field}
                        />
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
                      <FormLabel className="font-manrope font-medium text-text-main text-xs">Kelas</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12"
                          className="rounded-xl border-gray-200 bg-white font-manrope text-sm"
                          {...field}
                        />
                      </FormControl>
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
                    <FormLabel className="font-manrope font-medium text-text-main text-xs">Jurusan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 bg-white font-manrope text-sm">
                          <SelectValue placeholder="Pilih jurusan" />
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

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-manrope font-medium text-text-main text-xs">
                      Alasan Mengikuti Program
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ceritakan mengapa kamu ingin mengikuti program ini..."
                        className="min-h-[100px] rounded-xl border-gray-200 bg-white font-manrope text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-manrope text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-brand-navy font-semibold shadow-md hover:bg-brand-navy/90"
                size="lg"
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Pendaftaran
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
