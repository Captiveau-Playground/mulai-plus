"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export default function MyOrdersPage() {
  const _router = useRouter();
  const { data: orders, isLoading } = useQuery(orpc.payments.myOrders.queryOptions());

  const handlePay = (paymentUrl: string | null) => {
    if (!paymentUrl) {
      toast.error("Link pembayaran tidak ditemukan");
      return;
    }

    window.location.href = paymentUrl;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
      case "paid":
      case "settlement":
      case "capture":
        return <Badge className="bg-green-500 hover:bg-green-600">Berhasil</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Menunggu</Badge>;
      case "deny":
      case "cancel":
      case "expire":
      case "failure":
        return <Badge className="bg-red-500 hover:bg-red-600">Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 py-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Pesanan Saya</h1>
        <p className="text-muted-foreground">Riwayat pembelian kursus Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pesanan</CardTitle>
          <CardDescription>Daftar semua transaksi yang pernah Anda lakukan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kursus</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada pesanan.
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{order.course?.title || "Kursus Tidak Dikenal"}</span>
                        <span className="text-muted-foreground text-xs">
                          {order.paymentNumber || order.externalOrderId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "dd MMM yyyy HH:mm", {
                        locale: id,
                      })}
                    </TableCell>
                    <TableCell>{formatCurrency(order.amount)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {order.status === "pending" && (
                        <Button size="sm" onClick={() => handlePay(order.paymentUrl)}>
                          Bayar
                        </Button>
                      )}
                      {(order.status === "success" ||
                        order.status === "paid" ||
                        order.status === "settlement" ||
                        order.status === "capture") && (
                        <Button variant="outline" size="sm">
                          {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
                          <Link href={`/courses/${order.course?.slug}` as any}>Lihat Kelas</Link>
                        </Button>
                      )}
                      {["deny", "cancel", "expire", "failure"].includes(order.status) && (
                        <Button variant="ghost" size="sm">
                          {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
                          <Link href={`/courses/${order.course?.slug}` as any}>Beli Lagi</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
