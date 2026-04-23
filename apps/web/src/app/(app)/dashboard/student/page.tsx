"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, BookOpen, Calendar, Clock, GraduationCap, ShoppingCart, Video } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentDashboardPage() {
  const { data: myClasses, isLoading: isLoadingClasses } = useQuery(orpc.payments.myClasses.queryOptions());
  const { data: myOrders, isLoading: isLoadingOrders } = useQuery(orpc.payments.myOrders.queryOptions());
  const { data: myPrograms, isLoading: isLoadingPrograms } = useQuery(orpc.programs.student.myPrograms.queryOptions());
  const { data: mySessions, isLoading: isLoadingSessions } = useQuery(
    orpc.programActivities.student.mySessions.queryOptions(),
  );

  const isLoading = isLoadingClasses || isLoadingOrders || isLoadingPrograms || isLoadingSessions;

  const now = new Date();
  const upcomingSessions = mySessions?.filter((s) => new Date(s.startsAt) > now) || [];
  const pastSessions = mySessions?.filter((s) => new Date(s.startsAt) <= now) || [];
  const nextSession = upcomingSessions[0];

  return (
    <PageState isLoading={isLoading}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">
            Welcome back, Student!
          </h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            Track your learning journey and upcoming sessions.
          </p>
        </div>

        {/* Stats Cards - Brand Styled */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={GraduationCap}
            label="My Programs"
            value={myPrograms?.length || 0}
            sublabel="Active programs"
            href="/dashboard/student/programs"
            color="bg-brand-navy"
          />
          <StatCard
            icon={BookOpen}
            label="Enrolled Courses"
            value={myClasses?.length || 0}
            sublabel="Courses purchased"
            href="/dashboard/student/courses"
            color="bg-brand-red"
          />
          <StatCard
            icon={Calendar}
            label="Upcoming"
            value={upcomingSessions.length}
            sublabel="Scheduled events"
            href="/dashboard/student/schedule"
            color="bg-brand-orange"
          />
          <StatCard
            icon={ShoppingCart}
            label="Total Orders"
            value={myOrders?.length || 0}
            sublabel="Lifetime orders"
            href="/dashboard/student/orders"
            color="bg-brand-navy-light"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Next Session Card - Featured */}
          <div className="lg:col-span-2">
            <Card className="student-card overflow-hidden">
              <div className="gradient-brand-navy relative p-6 text-white sm:p-8">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-brand-orange/20 blur-[60px]" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-brand-red/20 blur-[40px]" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-inter font-semibold text-white/80 text-xs uppercase tracking-wider sm:text-sm">
                      Next Session
                    </span>
                  </div>
                  {nextSession ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold font-bricolage text-white text-xl sm:text-2xl lg:text-3xl">
                          Week {nextSession.week} -{" "}
                          {nextSession.type === "one_on_one" ? "1-on-1 Mentoring" : "Group Mentoring"}
                        </h3>
                        <p className="mt-1 font-manrope text-sm text-white/80 sm:text-base">
                          {nextSession.batch?.program?.name || "Your Program"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-white/70" />
                          <span className="font-manrope text-white/90 text-xs sm:text-sm">
                            {format(new Date(nextSession.startsAt), "EEE, MMM d • h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 overflow-hidden rounded-full bg-white/20">
                            {nextSession.mentor?.image ? (
                              <Image
                                src={nextSession.mentor.image}
                                alt={nextSession.mentor.name || ""}
                                className="h-full w-full object-cover"
                                width={24}
                                height={24}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white text-xs">
                                {nextSession.mentor?.name?.charAt(0) || "M"}
                              </div>
                            )}
                          </div>
                          <span className="font-manrope text-white/90 text-xs sm:text-sm">
                            with {nextSession.mentor?.name || "Mentor"}
                          </span>
                        </div>
                      </div>
                      {nextSession.meetingLink && (
                        <a
                          href={nextSession.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            size="lg"
                            className="mt-2 gap-2 rounded-full bg-white font-semibold text-brand-navy hover:bg-white/90"
                          >
                            <Video className="h-4 w-4" />
                            Join Meeting
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                        <Calendar className="h-8 w-8 text-white/50" />
                      </div>
                      <p className="font-manrope text-white/70">No upcoming sessions</p>
                      <Link href="/dashboard/student/schedule" className="mt-3">
                        <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
                          View All Sessions
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions / Recent Orders */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="student-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-bricolage text-lg text-text-main">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/student/programs" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-navy hover:bg-brand-navy/5">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-navy">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-manrope font-medium text-sm text-text-main">My Programs</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted-custom" />
                  </div>
                </Link>
                <Link href="/dashboard/student/courses" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-red hover:bg-brand-red/5">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-red">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-manrope font-medium text-sm text-text-main">My Courses</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted-custom" />
                  </div>
                </Link>
                <Link href="/dashboard/student/schedule" className="block">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-orange hover:bg-brand-orange/5">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-orange">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-manrope font-medium text-sm text-text-main">Schedule</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted-custom" />
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="student-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-bricolage text-lg text-text-main">Recent Orders</CardTitle>
                <Link
                  href="/dashboard/student/orders"
                  className="font-medium text-brand-navy text-xs hover:underline sm:text-sm"
                >
                  See All
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myOrders?.slice(0, 4).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy-light/10">
                          <BookOpen className="h-5 w-5 text-brand-navy-light" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-manrope font-medium text-sm text-text-main">
                            {order.course?.title || "Unknown Course"}
                          </p>
                          <p className="font-manrope text-text-muted-custom text-xs">
                            {format(new Date(order.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bricolage font-semibold text-sm text-text-main">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(order.amount)}
                        </p>
                        <Badge
                          variant={order.status === "success" ? "default" : "secondary"}
                          className={cn("mt-1 text-xs", order.status === "success" && "bg-green-500 text-white")}
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {!myOrders?.length && (
                    <div className="py-6 text-center font-manrope text-sm text-text-muted-custom">No orders yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Past Sessions Summary */}
        {pastSessions.length > 0 && (
          <Card className="student-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-bricolage text-lg text-text-main">Recent Sessions</CardTitle>
                <CardDescription className="font-manrope text-sm text-text-muted-custom">
                  Your last {Math.min(pastSessions.length, 5)} sessions attended
                </CardDescription>
              </div>
              <Link href="/dashboard/student/schedule?tab=past">
                <Button variant="outline" size="sm" className="rounded-full">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pastSessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-manrope font-medium text-sm text-text-main">
                        Week {session.week} - {session.type === "one_on_one" ? "1-on-1" : "Group"}
                      </p>
                      <p className="font-manrope text-text-muted-custom text-xs">
                        {format(new Date(session.startsAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageState>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href as Route}>
      <Card className="group cursor-pointer overflow-hidden border-0 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="flex items-center gap-4 bg-white p-4 sm:p-5 md:p-6">
          <div>
            <p className="font-inter font-medium text-text-muted-custom text-xs sm:text-sm">{label}</p>
            <p className="mt-1 font-bold font-bricolage text-2xl text-text-main sm:text-3xl md:text-4xl">{value}</p>
            <p className="mt-1 font-manrope text-text-muted-custom text-xs sm:text-sm">{sublabel}</p>
          </div>
          <div
            className={cn(
              "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 md:h-14 md:w-14",
              color,
            )}
          >
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6 md:h-7 md:w-7" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
