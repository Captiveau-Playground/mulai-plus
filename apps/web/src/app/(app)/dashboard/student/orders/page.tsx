"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export default function StudentOrdersPage() {
  const { data: orders, isLoading } = useQuery(orpc.payments.myOrders.queryOptions());

  return (
    <PageState isLoading={isLoading}>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">View your order history and payment status.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search orders..." className="pl-8" />
          </div>
          {/* Filter buttons could go here */}
        </div>

        <Card>
          <CardHeader className="px-6">
            <CardTitle>Order History</CardTitle>
            <CardDescription>Recent transactions from your account.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-xs">
                        #{order.paymentNumber || order.externalOrderId?.slice(-8) || "N/A"}
                      </TableCell>
                      <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>{order.course?.title || "Unknown Item"}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                        }).format(order.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === "success" ? "default" : "secondary"} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === "pending" && order.paymentUrl && (
                          <Button size="sm" variant="outline">
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
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageState>
  );
}
