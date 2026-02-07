import { Separator } from "@/components/ui/separator";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">Profile Settings</h3>
        <p className="text-muted-foreground text-sm">Manage your account settings and preferences.</p>
      </div>
      <Separator />
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Settings form coming soon
      </div>
    </div>
  );
}
