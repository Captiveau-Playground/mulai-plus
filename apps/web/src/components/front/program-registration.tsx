"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle, Clock, Loader2, MapPin, Phone, School, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
      class: "",
      school: "",
      major: "",
      domicile: "",
      reason: "",
      phone: "",
    },
  });

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
    return (
      <div className="w-full rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4">
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge status={applicationStatus.status ?? ""} />
        </div>
        <p className="text-center font-manrope text-sm text-text-muted-custom">Kamu sudah terdaftar di batch ini</p>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[600px]">
          <Card className="student-card border-0 shadow-none">
            <CardHeader className="bg-white px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="icon-box-navy">
                  <CalendarCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="font-bricolage text-lg text-text-main">
                    Pendaftaran Batch {batch.name}
                  </CardTitle>
                  <CardDescription className="font-manrope text-sm text-text-muted-custom">
                    Lengkapi data di bawah untuk mengajukan pendaftaran program.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-white px-6 pt-0 pb-6">
              <Separator className="mb-6" />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                      <CalendarCheck className="h-4 w-4 text-brand-navy" />
                      Data Diri
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Nama Lengkap</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" className="bg-white font-manrope" {...field} />
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
                              <Input placeholder="email@contoh.com" className="bg-white font-manrope" {...field} />
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
                              <Input placeholder="08123456789" className="bg-white font-manrope" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="domicile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1 font-manrope text-sm text-text-main">
                              <MapPin className="h-3 w-3 text-text-muted-custom" />
                              Kota Domisili
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Jakarta" className="bg-white font-manrope" {...field} />
                            </FormControl>
                            <FormMessage className="font-manrope text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                      <School className="h-4 w-4 text-brand-navy" />
                      Informasi Sekolah
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="school"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-manrope text-sm text-text-main">Sekolah</FormLabel>
                            <FormControl>
                              <Input placeholder="SMA Negeri 1 Jakarta" className="bg-white font-manrope" {...field} />
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
                            <FormControl>
                              <Input placeholder="12" className="bg-white font-manrope" {...field} />
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
                          <FormLabel className="font-manrope text-sm text-text-main">Jurusan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white font-manrope">
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
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 font-inter font-semibold text-sm text-text-main">
                      <CalendarCheck className="h-4 w-4 text-brand-navy" />
                      Motivasi
                    </h4>
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
                              placeholder="Ceritakan mengapa kamu ingin mengikuti program ini..."
                              className="min-h-[100px] bg-white font-manrope"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="font-manrope text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 rounded-full"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={applyMutation.isPending}
                      className="btn-brand-navy flex-1 rounded-full"
                    >
                      {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kirim Pendaftaran
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
