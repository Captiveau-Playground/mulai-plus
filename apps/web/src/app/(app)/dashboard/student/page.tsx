"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, Calendar, GraduationCap, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentDashboardPage() {
  const { data: myClasses } = useQuery(orpc.payments.myClasses.queryOptions());
  const { data: myOrders } = useQuery(orpc.payments.myOrders.queryOptions());
  const { data: myPrograms } = useQuery(orpc.programs.student.myPrograms.queryOptions());
  const { data: mySessions } = useQuery(orpc.programActivities.student.mySessions.queryOptions());

  const upcomingSessions = mySessions?.filter((s) => new Date(s.startsAt) > new Date()) || [];
  const nextSession = upcomingSessions[0];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/dashboard/student/programs" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">My Programs</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{myPrograms?.length || 0}</div>
              <p className="text-muted-foreground text-xs">Active programs</p>
            </CardContent>
          </Card>
        </Link>
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/dashboard/student/courses" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{myClasses?.length || 0}</div>
              <p className="text-muted-foreground text-xs">Courses purchased</p>
            </CardContent>
          </Card>
        </Link>
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/dashboard/student/schedule" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Upcoming Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{upcomingSessions.length}</div>
              <p className="text-muted-foreground text-xs">Scheduled events</p>
            </CardContent>
          </Card>
        </Link>
        {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
        <Link href={"/dashboard/student/orders" as any}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{myOrders?.length || 0}</div>
              <p className="text-muted-foreground text-xs">Lifetime orders</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Week {nextSession.week} - {nextSession.type.replace("_", " ")}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(nextSession.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant={nextSession.status === "scheduled" ? "default" : "secondary"}>
                      {nextSession.status}
                    </Badge>
                  </div>
                  {nextSession.notes && <p className="mt-2 text-muted-foreground text-sm">{nextSession.notes}</p>}
                  {nextSession.meetingLink && (
                    <a
                      href={nextSession.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants(), "mt-4")}
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground">No upcoming sessions scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm leading-none">{order.course?.title || "Unknown Course"}</p>
                    <p className="text-muted-foreground text-xs">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(order.amount)}
                    </div>
                    <Badge variant={order.status === "success" ? "default" : "secondary"} className="mt-1 text-xs">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!myOrders?.length && <div className="text-center text-muted-foreground text-sm">No orders found</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
