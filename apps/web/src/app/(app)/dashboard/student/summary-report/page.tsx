"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Award, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { generateSummaryReportPdf } from "@/lib/summary-report-pdf";
import { orpc } from "@/utils/orpc";

interface ReportItem {
  id: string;
  title: string;
  description: string;
}

interface Report {
  id: string;
  studentName?: string;
  student?: { name?: string | null };
  mentor?: { name?: string | null };
  batch?: { name?: string | null };
  programName?: string;
  mentorNotes?: string | null;
  items?: ReportItem[];
}

function DownloadButton({ report }: { report: Report }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateSummaryReportPdf({
        studentName: report.studentName || report.student?.name || "Student",
        mentorName: report.mentor?.name || "Mentor",
        batchName: report.batch?.name || "",
        programName: report.programName || "Mentoring Program",
        items: report.items?.map((i) => ({ title: i.title, description: i.description })) || [],
        mentorNotes: report.mentorNotes || null,
        date: format(new Date(), "dd MMMM yyyy", { locale: id }),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `summary-report-${report.student?.name || "mentee"}-${report.batch?.name || "program"}.pdf`
        .replace(/\s+/g, "-")
        .toLowerCase();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-navy to-mentor-teal font-manrope text-sm text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {loading ? "Generating PDF..." : "Download PDF"}
    </Button>
  );
}

export default function StudentSummaryReportPage() {
  const { data, isLoading } = useQuery({
    ...orpc.programs.studentSummaryReports.list.queryOptions({ input: {} }),
  });

  const reports = data?.data ?? [];

  return (
    <PageState>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">Summary Report</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            View your progress reports from mentors.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
          </div>
        ) : reports.length === 0 ? (
          <Card className="student-card">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center bg-white py-12 text-center sm:min-h-[400px]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-navy/10">
                <FileText className="h-10 w-10 text-brand-navy" />
              </div>
              <h3 className="font-bold font-bricolage text-text-main text-xl">No reports yet</h3>
              <p className="mt-2 mb-6 font-manrope text-sm text-text-muted-custom sm:text-base">
                Your mentor hasn&apos;t submitted a summary report yet. Reports appear here once approved.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report) => (
              <Card key={report.id} className="student-card overflow-hidden">
                <CardHeader className="bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mentor-teal/10">
                        <Award className="h-5 w-5 text-mentor-teal" />
                      </div>
                      <div>
                        <CardTitle className="font-bricolage text-lg text-text-main">
                          {report.batch?.name || "Program"}
                        </CardTitle>
                        <CardDescription className="font-manrope text-text-muted-custom">
                          Mentor: {report.mentor?.name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-green-500 font-manrope text-[10px] text-white">Approved</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 bg-white">
                  {report.items?.map((item, i) => (
                    <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                      <p className="font-manrope font-semibold text-sm text-text-main">
                        {i + 1}. {item.title}
                      </p>
                      <p className="mt-0.5 font-manrope text-text-muted-custom text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                  <DownloadButton report={report} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageState>
  );
}
