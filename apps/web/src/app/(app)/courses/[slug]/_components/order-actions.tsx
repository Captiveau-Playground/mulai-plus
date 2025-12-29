"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

declare global {
  interface Window {
    snap: any;
  }
}

interface OrderActionsProps {
  courseId: string;
  price: number;
  title: string;
  slug: string;
}

export function OrderActions({ courseId, price, title, slug }: OrderActionsProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isPolling, setIsPolling] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState<string | null>(null);

  // Check enrollment status
  const { data: enrollment, isLoading: isLoadingEnrollment } = useQuery(
    orpc.payments.checkEnrollment.queryOptions({
      input: { courseId },
      enabled: !!session,
    }),
  );

  const isEnrolled = enrollment?.isEnrolled;

  // Finish payment mutation (to sync status)
  const _finishPayment = useMutation(
    orpc.payments.finish.mutationOptions({
      onSuccess: (res) => {
        if (res.mapped_status === "success") {
          setIsPolling(false);
          toast.success("Pembayaran berhasil! Mengarahkan ke kelas...");
          router.refresh();
          setTimeout(() => {
            router.push("/dashboard/student" as any);
          }, 1000);
        }
      },
    }),
  );

  // Check status mutation (polling)
  const checkStatus = useMutation(
    orpc.payments.status.mutationOptions({
      onSuccess: async (res) => {
        if (res.status === "success") {
          setIsPolling(false);
          toast.success("Pembayaran berhasil! Mengarahkan ke kelas...");
          router.refresh();
          setTimeout(() => {
            router.push(`/courses/${slug}` as any);
          }, 1000);
        }
      },
    }),
  );

  // Create payment mutation
  const createPayment = useMutation(
    orpc.payments.create.mutationOptions({
      onSuccess: (data) => {
        if (data.snapToken) {
          if (data.paymentNumber) {
            setPaymentNumber(data.paymentNumber);
            setIsPolling(true);
          }

          if (window.snap) {
            window.snap.pay(data.snapToken, {
              onSuccess: (_result: any) => {
                toast.info("Memverifikasi status pembayaran...");
                if (data.paymentNumber) {
                  setIsPolling(true);
                  checkStatus.mutate({ payment_number: data.paymentNumber });
                }
              },
              onPending: (_result: any) => {
                toast.info("Pembayaran tertunda, silakan selesaikan pembayaran.");
              },
              onError: (_result: any) => {
                toast.error("Pembayaran gagal.");
                setIsPolling(false);
              },
              onClose: () => {
                toast.info("Jendela pembayaran ditutup.");
              },
            });
          } else {
            // Fallback if snap script is not loaded yet (should not happen due to useEffect)
            if (data.paymentUrl) {
              window.location.href = data.paymentUrl;
            } else {
              toast.error("Gagal memuat modul pembayaran.");
            }
          }
        } else {
          toast.error("Gagal membuat pembayaran: Token tidak ditemukan");
        }
      },
      onError: (err) => {
        toast.error(`Gagal membuat order: ${err.message}`);
      },
    }),
  );

  // Load Snap Script
  useEffect(() => {
    const scriptId = "midtrans-script";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    if (!document.getElementById(scriptId) && clientKey) {
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.id = scriptId;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }
  }, []);

  // Polling effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && paymentNumber) {
      interval = setInterval(() => {
        checkStatus.mutate({ payment_number: paymentNumber });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, paymentNumber, checkStatus]);

  const handleBuy = () => {
    if (!session) {
      toast.error("Silakan login terlebih dahulu");
      router.push(`/auth/sign-in?callbackUrl=/courses/${slug}` as any);
      return;
    }

    createPayment.mutate({
      tenant_id: "4dc357f4-77b0-480a-b52b-3b10d036f522", // TODO: Make dynamic
      external_order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount: price,
      currency: "IDR",
      customer_name: session.user.name || "Customer",
      customer_email: session.user.email || "customer@example.com",
      customer_phone: "08123456789", // Placeholder
      source_service: "LMS",
      course_id: courseId,
      item_details: [
        {
          id: courseId,
          name: title,
          price: price,
          quantity: 1,
        },
      ],
      return_url: `${window.location.origin}/payments/finish?slug=${slug}`,
    });
  };

  if (isLoadingEnrollment) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (isEnrolled) {
    return (
      <Button className="w-full" onClick={() => router.push(`/courses/${slug}` as any)}>
        Akses Kelas
      </Button>
    );
  }

  return (
    <Button className="w-full" size="lg" onClick={handleBuy} disabled={createPayment.isPending}>
      {createPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
      Beli Sekarang
    </Button>
  );
}
