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

export default function ProgramManagerAnalyticsPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    program_manager_dashboard: ["access"],
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">Total Programs</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{analytics.totalPrograms}</div>
                  <p className="text-muted-foreground text-xs">{analytics.activePrograms} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">Total Batches</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{analytics.totalBatches}</div>
                  <p className="text-muted-foreground text-xs">{analytics.activeBatches} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">Total Applicants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{analytics.totalApplicants}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">Total Participants</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{analytics.totalParticipants}</div>
                  <p className="text-muted-foreground text-xs">
                    {analytics.totalApplicants > 0
                      ? `${((analytics.totalParticipants / analytics.totalApplicants) * 100).toFixed(1)}% conversion rate`
                      : "0% conversion rate"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Applications Over Time</CardTitle>
                  <CardDescription>Daily application volume for the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.applicationsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                        <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>Latest students applying to programs.</CardDescription>
                </CardHeader>
                <CardContent>
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
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No applications found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.recentApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{app.user.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  {format(new Date(app.createdAt), "MMM d")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-xs">{app.program.name}</span>
                                <span className="text-muted-foreground text-xs">{app.batch?.name || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
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
