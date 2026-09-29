"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentOrdersPage() {
  const { data: orders, isLoading } = useQuery(orpc.payments.myOrders.queryOptions());

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Orders</h1>
          <p className="mt-2 font-manrope text-base text-text-muted-custom md:text-lg">
            View your order history and payment status.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted-custom" />
            <Input type="search" placeholder="Search orders..." className="pl-9 font-manrope" />
          </div>
        </div>

        <Card className="student-card">
          <CardHeader className="bg-white px-4 pb-4 sm:px-6 sm:pb-6">
            <CardTitle className="font-bricolage text-lg text-text-main">Order History</CardTitle>
            <CardDescription className="font-manrope text-sm text-text-muted-custom">
              Recent transactions from your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px] font-inter text-text-muted-custom text-xs sm:text-sm">
                      Order ID
                    </TableHead>
                    <TableHead className="font-inter text-text-muted-custom text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="font-inter text-text-muted-custom text-xs sm:text-sm">Item</TableHead>
                    <TableHead className="font-inter text-text-muted-custom text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="font-inter text-text-muted-custom text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-right font-inter text-text-muted-custom text-xs sm:text-sm">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders && orders.length > 0 ? (
                    orders.map((order) => (
                      <TableRow key={order.id} className="border-gray-100 border-b hover:bg-brand-navy/5">
                        <TableCell className="font-manrope font-medium text-text-main text-xs">
                          #{order.paymentNumber || order.externalOrderId?.slice(-8) || "N/A"}
                        </TableCell>
                        <TableCell className="font-manrope text-sm text-text-muted-custom">
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-manrope text-sm text-text-main">
                          {order.course?.title || "Unknown Item"}
                        </TableCell>
                        <TableCell className="font-bricolage font-semibold text-sm text-text-main">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(order.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={order.status === "success" ? "default" : "secondary"}
                            className={cn(
                              "font-inter text-xs capitalize",
                              order.status === "success" && "bg-green-500 text-white",
                              order.status === "pending" && "bg-brand-orange text-white",
                            )}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status === "pending" && order.paymentUrl && (
                            <Button size="sm" variant="outline" className="rounded-full text-xs sm:text-sm">
                              <a href={order.paymentUrl} target="_blank" rel="noopener noreferrer">
                                Pay Now
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Package className="mb-4 h-12 w-12 text-brand-navy/30" />
                          <p className="font-manrope text-text-muted-custom">No orders found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageState>
  );
}
