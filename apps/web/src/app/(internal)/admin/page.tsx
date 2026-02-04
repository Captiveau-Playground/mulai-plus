"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Ban, Key, Loader2, Shield, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis } from "recharts";

import { RecentApplicationsWidget } from "@/components/admin/dashboard/recent-applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function AdminPage() {
  const { isAuthorized, isLoading: isAuthLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const { data: stats, isLoading, isError } = useQuery(orpc.getAdminStats.queryOptions());

  if (isAuthLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Unauthorized</p>
      </div>
    );
  }

  const chartConfig = {
    users: {
      label: "Users",
      color: "hsl(var(--chart-1))",
    },
    role: {
      label: "Role",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const roleData =
    stats?.usersByRole?.map((item) => ({
      role: item.role,
      users: item.count,
      fill: "var(--color-users)",
    })) || [];

  const activeData = [
    {
      browser: "active",
      visitors: stats?.totalUsers ? stats.totalUsers - (stats.bannedUsers || 0) : 0,
      fill: "var(--color-active)",
    },
    {
      browser: "banned",
      visitors: stats?.bannedUsers || 0,
      fill: "var(--color-banned)",
    },
  ];

  const activeConfig = {
    visitors: {
      label: "Users",
    },
    active: {
      label: "Active",
      color: "hsl(var(--chart-2))",
    },
    banned: {
      label: "Banned",
      color: "hsl(var(--destructive))",
    },
  } satisfies ChartConfig;

  return (
    <>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : isError ? (
                <span className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> Error
                </span>
              ) : (
                (stats?.totalUsers ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">Registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : isError ? (
                <span className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> Error
                </span>
              ) : (
                (stats?.totalRoles ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">Defined roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : isError ? (
                <span className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> Error
                </span>
              ) : (
                (stats?.totalPermissions ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">System permissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : isError ? (
                <span className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> Error
                </span>
              ) : (
                (stats?.activeSessions ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Banned Users</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : isError ? (
                <span className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> Error
                </span>
              ) : (
                (stats?.bannedUsers ?? 0)
              )}
            </div>
            <p className="text-muted-foreground text-xs">Restricted access</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>Distribution of users across different roles</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={roleData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="role"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="users" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>User Status</CardTitle>
            <CardDescription>Active vs Banned users ratio</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={activeConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={activeData} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground font-bold text-3xl">
                              {stats?.totalUsers?.toLocaleString()}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                              Users
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>Newest users joined the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentUsers?.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-sm leading-none">{user.name}</p>
                      <p className="text-muted-foreground text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground text-sm capitalize">{user.role}</div>
                    <div className="text-muted-foreground text-sm">{new Date(user.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <div className="py-4 text-center text-muted-foreground text-sm">No recent users found</div>
              )}
            </div>
          </CardContent>
        </Card>

        <RecentApplicationsWidget />
      </div>
    </>
  );
}
