"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, Link as LinkIcon, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function StudentSchedulePage() {
  const { data: sessions, isLoading } = useQuery(orpc.programActivities.student.mySessions.queryOptions());

  const now = new Date();
  const upcomingSessions = sessions?.filter((s) => new Date(s.startsAt) > now) || [];
  const pastSessions = sessions?.filter((s) => new Date(s.startsAt) <= now) || [];

  return (
    <PageState isLoading={isLoading}>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">View your upcoming and past learning sessions.</p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastSessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 pt-4">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => <SessionCard key={session.id} session={session} isUpcoming />)
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground opacity-50" />
                <h3 className="mt-4 font-semibold text-lg">No upcoming sessions</h3>
                <p className="text-muted-foreground text-sm">You're all caught up!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 pt-4">
            {pastSessions.length > 0 ? (
              pastSessions.map((session) => <SessionCard key={session.id} session={session} />)
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground opacity-50" />
                <h3 className="mt-4 font-semibold text-lg">No past sessions</h3>
                <p className="text-muted-foreground text-sm">You haven't attended any sessions yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageState>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function SessionCard({ session, isUpcoming }: { session: any; isUpcoming?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{session.batch?.program?.name || "Program Session"}</Badge>
              <Badge variant={session.status === "scheduled" ? "default" : "secondary"}>{session.status}</Badge>
            </div>
            <CardTitle className="text-xl">
              Week {session.week} - {session.type.replace("_", " ")}
            </CardTitle>
            <CardDescription>
              {format(new Date(session.startsAt), "EEEE, MMMM d, yyyy")} •{" "}
              {format(new Date(session.startsAt), "h:mm a")} -{" "}
              {format(
                new Date(
                  session.endsAt ||
                    new Date(new Date(session.startsAt).getTime() + (session.durationMinutes || 60) * 60000),
                ),
                "h:mm a",
              )}
            </CardDescription>
          </div>
          {isUpcoming && session.meetingLink && (
            <a
              href={session.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-2")}
            >
              <LinkIcon className="h-4 w-4" />
              Join
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={session.mentor?.image} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span>with {session.mentor?.name || "Mentor"}</span>
          </div>
        </div>
        {session.notes && <p className="mt-4 text-muted-foreground text-sm">{session.notes}</p>}
      </CardContent>
    </Card>
  );
}
