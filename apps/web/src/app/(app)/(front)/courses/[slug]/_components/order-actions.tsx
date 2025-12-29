"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

interface OrderActionsProps {
  courseId: string;
  price: number;
  title: string;
  slug: string;
}

export function OrderActions({ courseId, price, title, slug }: OrderActionsProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Check enrollment status
  const { data: enrollment, isLoading: isLoadingEnrollment } = useQuery(
    orpc.payments.checkEnrollment.queryOptions({
      input: { courseId },
      enabled: !!session,
    }),
  );

  const isEnrolled = enrollment?.isEnrolled;

  // Create payment mutation
  const createPayment = useMutation(
    orpc.payments.create.mutationOptions({
      onSuccess: (data) => {
        if (data.snapToken) {
          if (data.paymentUrl) {
            window.location.href = data.paymentUrl;
          } else {
            toast.error("Gagal memuat link pembayaran.");
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
