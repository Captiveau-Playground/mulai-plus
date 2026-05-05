"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, GraduationCap, Layers, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function ProgramAnalyticsPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    ...orpc.programs.admin.analytics.queryOptions(),
    enabled: !!isAuthorized,
  });

  return (
    <div className="mentor-page-bg min-h-screen flex-1 rounded-xl bg-bg-light p-4 md:min-h-min">
      <PageState isLoading={isAuthLoading || isAnalyticsLoading} isAuthorized={isAuthorized}>
        {!analytics ? (
          <div className="font-manrope text-text-muted-custom">Failed to load analytics.</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Program Analytics</h2>
              <p className="font-manrope text-text-muted-custom">Overview of program performance and statistics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="mentor-card">
                <CardContent className="flex items-center gap-4 bg-white p-5">
                  <div className="icon-box-navy shrink-0">
                    <BookOpen className="h-5 w-5 text-white md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">
                      Total Programs
                    </p>
                    <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">
                      {analytics.totalPrograms}
                    </p>
                    <p className="font-manrope text-text-muted-custom text-xs">{analytics.activePrograms} active</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="mentor-card">
                <CardContent className="flex items-center gap-4 bg-white p-5">
                  <div className="icon-box-light shrink-0">
                    <Layers className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">
                      Total Batches
                    </p>
                    <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">
                      {analytics.totalBatches}
                    </p>
                    <p className="font-manrope text-text-muted-custom text-xs">{analytics.activeBatches} active</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="mentor-card">
                <CardContent className="flex items-center gap-4 bg-white p-5">
                  <div className="icon-box-light shrink-0">
                    <Users className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">
                      Total Applicants
                    </p>
                    <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">
                      {analytics.totalApplicants}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="mentor-card">
                <CardContent className="flex items-center gap-4 bg-white p-5">
                  <div className="icon-box-light shrink-0">
                    <GraduationCap className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">
                      Total Participants
                    </p>
                    <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">
                      {analytics.totalParticipants}
                    </p>
                    <p className="font-manrope text-text-muted-custom text-xs">
                      {analytics.totalApplicants > 0
                        ? `${((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1)}% conversion`
                        : "0% conversion rate"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="mentor-card col-span-4">
                <CardHeader className="bg-white">
                  <CardTitle className="font-bricolage text-lg text-text-main">Applications Over Time</CardTitle>
                  <CardDescription className="font-manrope text-text-muted-custom">
                    Daily application volume for the last 30 days.
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-white pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.applicationsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => format(new Date(value), "MMM d")}
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          content={({ active, payload }) => {
                            if (active && payload?.length) {
                              return (
                                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col">
                                      <span className="font-manrope font-semibold text-[0.7rem] text-text-muted-custom uppercase tracking-wider">
                                        Date
                                      </span>
                                      <span className="font-bold font-manrope text-text-main text-xs">
                                        {format(new Date(payload[0].payload.date), "MMM d, yyyy")}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-manrope font-semibold text-[0.7rem] text-text-muted-custom uppercase tracking-wider">
                                        Apps
                                      </span>
                                      <span className="font-bold font-manrope text-text-main">{payload[0].value}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-mentor-teal" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="mentor-card col-span-3">
                <CardHeader className="bg-white">
                  <CardTitle className="font-bricolage text-lg text-text-main">Recent Applications</CardTitle>
                  <CardDescription className="font-manrope text-text-muted-custom">
                    Latest students applying to programs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-white p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.recentApplications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center font-manrope text-text-muted-custom">
                            No applications found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.recentApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <span className="font-manrope font-medium text-sm text-text-main">{app.user.name}</span>
                              <span className="block font-manrope text-text-muted-custom text-xs">
                                {format(new Date(app.createdAt), "MMM d")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="block font-manrope text-text-main text-xs">{app.program.name}</span>
                              <span className="block font-manrope text-text-muted-custom text-xs">
                                {app.batch?.name || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  app.status === "accepted"
                                    ? "default"
                                    : app.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="font-manrope text-xs capitalize"
                              >
                                {app.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageState>
    </div>
  );
}
