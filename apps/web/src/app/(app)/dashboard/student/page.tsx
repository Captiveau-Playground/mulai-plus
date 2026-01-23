"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export default function StudentDashboardPage() {
  const { data: myClasses } = useQuery(orpc.payments.myClasses.queryOptions());
  const { data: myOrders } = useQuery(orpc.payments.myOrders.queryOptions());

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/dashboard/student/orders" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{myOrders?.length || 0}</div>
            </CardContent>
          </Card>
        </Link>
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/courses" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Enrolled Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{myClasses?.length || 0}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
        <h2 className="mb-4 font-semibold text-lg">Welcome back!</h2>
        <p className="text-muted-foreground">Select an item from the sidebar to get started.</p>
      </div>
    </div>
  );
}
