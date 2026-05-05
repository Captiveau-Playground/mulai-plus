import { BookOpen, Clock, GraduationCap, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "@/utils/orpc";

export default async function ProgramManagerPage() {
  const stats = await client.programs.admin.analytics();

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="font-bold font-bricolage text-3xl text-brand-navy tracking-tight">Dashboard</h2>
        <p className="font-manrope text-text-muted-custom">Overview of your programs and activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-navy shrink-0">
              <BookOpen className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Programs</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{stats.totalPrograms}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-light shrink-0">
              <Clock className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Active Batches</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{stats.activeBatches}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-light shrink-0">
              <Users className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Applicants</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{stats.totalApplicants}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card">
          <CardContent className="flex items-center gap-4 bg-white p-5">
            <div className="icon-box-light shrink-0">
              <GraduationCap className="h-5 w-5 text-brand-navy md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-manrope text-text-muted-custom text-xs uppercase tracking-wider">Total Participants</p>
              <p className="font-bold font-bricolage text-3xl text-text-main md:text-4xl">{stats.totalParticipants}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="mentor-card col-span-4">
          <CardHeader className="bg-white">
            <CardTitle className="font-bricolage text-lg text-text-main">Recent Applications</CardTitle>
            <CardDescription className="font-manrope text-text-muted-custom">
              You have new applications to review.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={app.user?.image ?? ""} alt="Avatar" />
                    <AvatarFallback>{app.user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="font-manrope font-medium text-sm text-text-main leading-none">{app.user?.name}</p>
                    <p className="font-manrope text-sm text-text-muted-custom">{app.program?.name}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant={
                        app.status === "accepted" ? "default" : app.status === "rejected" ? "destructive" : "secondary"
                      }
                      className="font-manrope text-xs capitalize"
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {stats.recentApplications.length === 0 && (
                <p className="font-manrope text-sm text-text-muted-custom">No recent applications</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mentor-card col-span-3">
          <CardHeader className="bg-white">
            <CardTitle className="font-bricolage text-lg text-text-main">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 bg-white">
            <a
              href="/program-manager/programs"
              className="flex items-center rounded-xl p-3 font-manrope text-sm text-text-main transition-colors hover:bg-mentor-teal/5"
            >
              <BookOpen className="mr-3 h-5 w-5 text-mentor-teal" />
              <span>Manage Programs</span>
            </a>
            <a
              href="/program-manager/programs/mentors"
              className="flex items-center rounded-xl p-3 font-manrope text-sm text-text-main transition-colors hover:bg-mentor-teal/5"
            >
              <Users className="mr-3 h-5 w-5 text-mentor-teal" />
              <span>Manage Mentors</span>
            </a>
            <a
              href="/program-manager/programs/testimonials"
              className="flex items-center rounded-xl p-3 font-manrope text-sm text-text-main transition-colors hover:bg-mentor-teal/5"
            >
              <Users className="mr-3 h-5 w-5 text-mentor-teal" />
              <span>Manage Testimonials</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
