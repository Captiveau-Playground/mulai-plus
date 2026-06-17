"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  DollarSign,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_ENDPOINT = "/ai/admin/stats";

interface Stats {
  total_sessions: number;
  guest_sessions: number;
  auth_sessions: number;
  total_messages: number;
  today_messages: number;
  today_sessions: number;
  recent_questions: { question: string; is_auth: boolean }[];
  top_questions: { question: string; count: number }[];
  total_cost: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
}

export default function ChatbotAnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery<Stats>({
    queryKey: ["chatbot-analytics"],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINT, {});
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30_000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Bot className="mb-4 h-12 w-12 text-gray-300" />
        <h2 className="font-bold font-bricolage text-gray-900 text-xl">AI Service Offline</h2>
        <p className="mt-1 mb-6 font-manrope text-gray-500 text-sm">
          Python AI service tidak dapat dijangkau. Pastikan `uvicorn` berjalan di port 8000.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
        </Button>
      </div>
    );
  }

  const guestPct = data.total_sessions > 0 ? Math.round((data.guest_sessions / data.total_sessions) * 100) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Chatbot Analytics</h2>
          <p className="font-manrope text-sm text-text-muted-custom">Live stats dari MULAI+ AI chatbot.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bricolage text-sm text-text-muted-custom">
              <MessageSquare className="h-4 w-4" /> Total Pesan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold font-bricolage text-3xl text-brand-navy">{data.total_messages}</p>
            <p className="font-manrope text-text-muted-custom text-xs">{data.today_messages} hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bricolage text-sm text-text-muted-custom">
              <Users className="h-4 w-4" /> Sesi Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold font-bricolage text-3xl text-brand-navy">{data.total_sessions}</p>
            <p className="font-manrope text-text-muted-custom text-xs">{data.today_sessions} sesi baru hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bricolage text-sm text-text-muted-custom">
              <UserCheck className="h-4 w-4" /> User Terdaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold font-bricolage text-3xl text-brand-navy">{data.auth_sessions}</p>
            <p className="font-manrope text-text-muted-custom text-xs">
              {data.total_sessions > 0 ? `${100 - guestPct}% dari total sesi` : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bricolage text-sm text-text-muted-custom">
              <BarChart3 className="h-4 w-4" /> Guest vs Auth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold font-bricolage text-3xl text-brand-navy">{guestPct}%</p>
            <p className="font-manrope text-text-muted-custom text-xs">
              {data.guest_sessions} guest : {data.auth_sessions} terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-bricolage text-sm text-text-muted-custom">
              <DollarSign className="h-4 w-4" /> Biaya Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold font-bricolage text-3xl text-brand-navy">${data.total_cost.toFixed(4)}</p>
            <p className="font-manrope text-text-muted-custom text-xs">
              {data.total_prompt_tokens.toLocaleString()} prompt · {data.total_completion_tokens.toLocaleString()}{" "}
              completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Questions & Recent Questions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bricolage text-brand-navy text-lg">
              <TrendingUp className="h-5 w-5 text-brand-orange" /> Pertanyaan Terpopuler
            </CardTitle>
            <CardDescription className="font-manrope">Top 10 pertanyaan yang paling sering ditanyakan</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top_questions.length === 0 ? (
              <p className="py-8 text-center font-manrope text-sm text-text-muted-custom">Belum ada data</p>
            ) : (
              <div className="space-y-2">
                {data.top_questions.map((q, i) => (
                  <div key={q.question} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-[10px] text-white">
                        {i + 1}
                      </span>
                      <span className="truncate font-manrope text-sm text-text-main">{q.question}</span>
                    </div>
                    <Badge className="ml-2 shrink-0 bg-brand-navy/10 font-manrope text-[10px] text-brand-navy">
                      {q.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bricolage text-brand-navy text-lg">
              <MessageSquare className="h-5 w-5 text-brand-orange" /> Pertanyaan Terbaru
            </CardTitle>
            <CardDescription className="font-manrope">50 pertanyaan terakhir dari semua sesi</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_questions.length === 0 ? (
              <p className="py-8 text-center font-manrope text-sm text-text-muted-custom">Belum ada chat</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1.5">
                  {data.recent_questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-50">
                      <Badge
                        className={`shrink-0 font-manrope text-[9px] ${
                          q.is_auth ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {q.is_auth ? "Auth" : "Guest"}
                      </Badge>
                      <span className="truncate font-manrope text-text-main">{q.question}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
