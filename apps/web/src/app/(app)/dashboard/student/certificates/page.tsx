import { Award } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";

export default function StudentCertificatesPage() {
  return (
    <PageState>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl lg:text-5xl">My Certificates</h1>
          <p className="font-manrope text-base text-text-muted-custom md:text-lg">
            View and download your earned certificates.
          </p>
        </div>

        <Card className="student-card">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center bg-white py-12 text-center sm:min-h-[400px]">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-navy/10">
              <Award className="h-10 w-10 text-brand-navy" />
            </div>
            <h3 className="font-bold font-bricolage text-text-main text-xl">No certificates earned yet</h3>
            <p className="mt-2 mb-6 font-manrope text-sm text-text-muted-custom sm:text-base">
              Complete courses and programs to earn certificates.
            </p>
            <Link href="/dashboard/student/programs">
              <Button className="btn-brand-navy rounded-full">View My Programs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageState>
  );
}
