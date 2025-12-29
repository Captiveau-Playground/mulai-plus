"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function FinishPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");

  const orderId = searchParams.get("order_id");
  const statusCode = searchParams.get("status_code");
  const transactionStatus = searchParams.get("transaction_status");
  const slug = searchParams.get("slug");

  const finishPayment = useMutation(
    orpc.payments.finish.mutationOptions({
      onSuccess: (res) => {
        if (res.mapped_status === "success") {
          setStatus("success");
          toast.success("Pembayaran berhasil!");
          setTimeout(() => {
            if (slug) {
              router.push(`/courses/${slug}` as any);
            } else {
              router.push("/dashboard/student" as any);
            }
          }, 3000);
        } else if (res.mapped_status === "pending") {
          setStatus("pending");
          toast.info("Pembayaran sedang diproses.");
          setTimeout(() => {
            if (slug) {
              router.push(`/courses/${slug}` as any);
            } else {
              router.push("/dashboard/student" as any);
            }
          }, 3000);
        } else {
          setStatus("failed");
          toast.error("Pembayaran gagal atau dibatalkan.");
        }
      },
      onError: (err) => {
        setStatus("failed");
        toast.error(`Gagal memverifikasi pembayaran: ${err.message}`);
      },
    }),
  );

  useEffect(() => {
    if (orderId) {
      finishPayment.mutate({
        order_id: orderId,
        status_code: statusCode || undefined,
        transaction_status: transactionStatus || undefined,
      });
    } else {
      setStatus("failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, statusCode, transactionStatus, finishPayment.mutate]);

  const handleRedirect = () => {
    if (slug) {
      router.push(`/courses/${slug}` as any);
    } else {
      router.push("/dashboard/student" as any);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
            {status === "pending" && <AlertCircle className="h-12 w-12 text-yellow-500" />}
            {status === "failed" && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === "loading" && "Memproses Pembayaran..."}
            {status === "success" && "Pembayaran Berhasil!"}
            {status === "pending" && "Menunggu Pembayaran"}
            {status === "failed" && "Pembayaran Gagal"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Mohon tunggu sebentar, kami sedang memverifikasi pembayaran Anda."}
            {status === "success" &&
              "Terima kasih! Pembayaran Anda telah dikonfirmasi. Anda akan dialihkan ke kelas sebentar lagi."}
            {status === "pending" && "Pembayaran Anda masih tertunda. Silakan selesaikan pembayaran Anda."}
            {status === "failed" && "Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi."}
          </CardDescription>
        </CardHeader>
        <CardContent>{/* Optional details could go here */}</CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleRedirect} disabled={status === "loading"}>
            {status === "success" ? "Ke Kelas Sekarang" : "Kembali ke Kelas"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
