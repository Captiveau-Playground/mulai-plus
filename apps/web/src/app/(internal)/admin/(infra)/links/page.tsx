"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as LinkIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function AdminLinksPage() {
  const { isAuthorized, isLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });

  const queryClient = useQueryClient();
  const [slug, setSlug] = useState("");
  const [to, setTo] = useState("/");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  const { data: links } = useQuery(orpc.shortLinks.getAll.queryOptions({}));

  const updateLink = useMutation(
    orpc.shortLinks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.shortLinks.getAll.key() });
        toast.success("Link saved");
        setSlug("");
        setTo("/");
        setUtmSource("");
        setUtmMedium("");
        setUtmCampaign("");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteLink = useMutation(
    orpc.shortLinks.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.shortLinks.getAll.key() });
        toast.success("Link deleted");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const entries = Object.entries(links ?? {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      toast.error("Slug is required");
      return;
    }
    updateLink.mutate({
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      config: {
        to: to.startsWith("/") ? to : `/${to}`,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      },
    });
  };

  return (
    <PageState isLoading={isLoading} isAuthorized={isAuthorized}>
      <div className="flex min-h-screen flex-1 flex-col gap-6 rounded-xl bg-muted/50 p-4 md:min-h-min">
        {/* Header */}
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Short Links</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage short URLs for social media bios.{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">go.mulaiplus.id/ig</code>
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              {slug ? `Edit: go.mulaiplus.id/${slug}` : "New Short Link"}
            </CardTitle>
            <CardDescription>Create or update a short-link redirect with UTM tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="slug" className="font-medium text-xs">
                    Slug
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 font-mono text-muted-foreground text-xs">go.mulaiplus.id/</span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="ig"
                      className="h-9 font-mono text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="to" className="font-medium text-xs">
                    Redirect to
                  </Label>
                  <Input
                    id="to"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="/"
                    className="h-9 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="utm_source" className="font-medium text-xs">
                    UTM Source
                  </Label>
                  <Input
                    id="utm_source"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    placeholder="instagram"
                    className="h-9 font-mono text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="utm_medium" className="font-medium text-xs">
                    UTM Medium
                  </Label>
                  <Input
                    id="utm_medium"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    placeholder="social"
                    className="h-9 font-mono text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="utm_campaign" className="font-medium text-xs">
                    UTM Campaign
                  </Label>
                  <Input
                    id="utm_campaign"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="bio"
                    className="h-9 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={updateLink.isPending} className="w-fit">
                {updateLink.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Link"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Links List */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-muted-foreground text-sm">
            Existing Links <span className="font-normal">({entries.length})</span>
          </h3>

          {entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No short links configured yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entries.map(([slugKey, link]) => (
                <div
                  key={slugKey}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <code className="rounded bg-muted/50 px-1.5 py-0.5 font-medium font-mono text-sm">
                        go.mulaiplus.id/{slugKey}
                      </code>
                      <span className="text-muted-foreground">→</span>
                      <code className="font-mono text-muted-foreground text-xs">{link.to}</code>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                      <span>
                        utm_source: <code className="font-mono">{link.utm_source}</code>
                      </span>
                      <span>
                        utm_medium: <code className="font-mono">{link.utm_medium}</code>
                      </span>
                      <span>
                        utm_campaign: <code className="font-mono">{link.utm_campaign}</code>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setSlug(slugKey);
                        setTo(link.to);
                        setUtmSource(link.utm_source);
                        setUtmMedium(link.utm_medium);
                        setUtmCampaign(link.utm_campaign);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => deleteLink.mutate({ slug: slugKey })}
                      disabled={deleteLink.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageState>
  );
}
