import { BookOpen, Clock, GraduationCap, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "@/utils/orpc";

export default async function ProgramManagerPage() {
  const stats = await client.programs.admin.analytics();

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="font-bold text-3xl tracking-tight">Program Manager Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Programs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.totalPrograms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Batches</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.activeBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Applicants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.totalApplicants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Participants</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.totalParticipants}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>You have new applications to review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={app.user?.image ?? ""} alt="Avatar" />
                    <AvatarFallback>{app.user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="font-medium text-sm leading-none">{app.user?.name}</p>
                    <p className="text-muted-foreground text-sm">{app.program?.name}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant={
                        app.status === "accepted" ? "default" : app.status === "rejected" ? "destructive" : "secondary"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {stats.recentApplications.length === 0 && (
                <p className="text-muted-foreground text-sm">No recent applications</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/program-manager/programs" className="flex items-center rounded-md p-2 hover:bg-accent">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Manage Programs</span>
            </a>
            <a href="/program-manager/testimonials" className="flex items-center rounded-md p-2 hover:bg-accent">
              <Users className="mr-2 h-4 w-4" />
              <span>Manage Testimonials</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
