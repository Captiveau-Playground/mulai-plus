"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define a type that matches the session structure used in the parent component
export interface CalendarSession {
  id: string;
  week: number;
  startsAt: string | Date;
  durationMinutes: number;
  type: "one_on_one" | "group_mentoring";
  status: "scheduled" | "completed" | "cancelled" | "missed";
  mentor: { name: string | null };
  mentorId: string;
  student?: { name: string | null } | null;
  studentId?: string | null;
  meetingLink?: string | null;
  recordingLink?: string | null;
  notes?: string | null;
}

interface BatchSessionsCalendarProps {
  sessions: CalendarSession[];
  onEditSession: (session: CalendarSession) => void;
  onDateClick?: (date: Date) => void;
}

export function BatchSessionsCalendar({ sessions, onEditSession, onDateClick }: BatchSessionsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const startDate = startOfWeek(firstDayOfMonth);
  const endDate = endOfWeek(lastDayOfMonth);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getSessionsForDay = (date: Date) => {
    return sessions
      .filter((session) => isSameDay(new Date(session.startsAt), date))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="font-semibold text-lg">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center rounded-md border bg-background shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2 text-center font-medium text-muted-foreground text-xs">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid auto-rows-fr grid-cols-7">
          {days.map((day, dayIdx) => {
            const daySessions = getSessionsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "group relative min-h-[120px] border-r border-b transition-colors hover:bg-muted/20",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                  dayIdx % 7 === 6 && "border-r-0",
                )}
              >
                <button
                  type="button"
                  className="absolute inset-0 z-0 m-0 h-full w-full border-0 bg-transparent p-0 outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                  onClick={() => onDateClick?.(day)}
                  aria-label={`Create session on ${format(day, "PPP")}`}
                />
                <div className="pointer-events-none relative z-10 flex h-full flex-col p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs",
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="font-medium text-[10px] text-muted-foreground">
                        {daySessions.length} sessions
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-col space-y-1">
                    {daySessions.map((session) => (
                      <button
                        type="button"
                        key={session.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSession(session);
                        }}
                        className={cn(
                          "pointer-events-auto w-full rounded-md border p-1.5 text-left text-xs transition-all hover:scale-[1.02] active:scale-[0.98]",
                          session.status === "cancelled"
                            ? "border-destructive/20 bg-destructive/10 line-through opacity-70"
                            : session.status === "completed"
                              ? "border-green-500/20 bg-green-500/10"
                              : "border-border bg-background hover:border-primary/50",
                        )}
                      >
                        <div className="mb-0.5 flex items-center gap-1.5">
                          {session.type === "one_on_one" ? (
                            <User className="h-3 w-3 shrink-0 text-blue-500" />
                          ) : (
                            <Users className="h-3 w-3 shrink-0 text-green-500" />
                          )}
                          <span className="truncate font-semibold">{format(new Date(session.startsAt), "HH:mm")}</span>
                        </div>
                        <div className="truncate pl-4.5 text-[10px] text-muted-foreground">
                          {session.type === "one_on_one" ? session.student?.name || "Unknown Student" : "Group Session"}
                        </div>
                      </button>
                    ))}

                    {/* Add Button on Hover (Desktop) */}
                    <div className="pointer-events-auto absolute right-2 bottom-2 hidden opacity-0 transition-opacity group-hover:opacity-100 md:block">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateClick?.(day);
                        }}
                      >
                        <span className="font-bold text-xs">+</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
