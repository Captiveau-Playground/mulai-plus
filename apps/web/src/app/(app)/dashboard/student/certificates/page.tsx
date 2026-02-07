import { Award } from "lucide-react";
import { PageState } from "@/components/ui/page-state";

export default function StudentCertificatesPage() {
  return (
    <PageState>
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-lg">My Certificates</h3>
          <p className="text-muted-foreground text-sm">View and download your earned certificates.</p>
        </div>

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Award className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-lg">No certificates earned yet</h3>
          <p className="mt-2 mb-4 text-muted-foreground text-sm">Complete courses and programs to earn certificates.</p>
        </div>
      </div>
    </PageState>
  );
}
