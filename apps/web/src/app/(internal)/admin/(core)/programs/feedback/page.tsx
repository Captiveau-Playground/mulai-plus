"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle, ClipboardList, Loader2, MessageSquare, Plus, Trash, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const feedbackTypeLabels: Record<string, string> = {
  mentee_to_mentor: "Mentee → Mentor",
  mentee_to_platform: "Mentee → MulaiPlus",
  mentor_to_platform: "Mentor → MulaiPlus",
};

export default function FeedbackPage() {
  const { data: templates, isLoading } = useQuery({
    ...orpc.feedback.template.list.queryOptions(),
  });

  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">Feedback Management</h2>
        <p className="font-manrope text-text-muted-custom">
          Manage feedback templates and campaigns for program evaluation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">
            <ClipboardList className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <MessageSquare className="mr-2 h-4 w-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <TemplateManager templates={templates || []} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <CampaignManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Template Manager ──────────────────────────────────────

function TemplateManager({ templates }: { templates: any[] }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const deleteMutation = useMutation(
    orpc.feedback.template.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Template deleted");
        queryClient.invalidateQueries({ queryKey: orpc.feedback.template.list.key() });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-manrope text-sm text-text-muted-custom">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setIsCreateOpen(true)} className="btn-mentor rounded-full">
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
          <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-manrope font-medium text-text-muted-custom">No templates yet</p>
          <p className="font-manrope text-text-muted-custom text-xs">
            Create your first feedback template to start collecting responses.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl: any) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold font-bricolage text-base text-text-main">{tpl.name}</h3>
                  <Badge variant="outline" className="mt-1 font-manrope text-[10px]">
                    {feedbackTypeLabels[tpl.type] || tpl.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-red-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => {
                    if (confirm("Delete this template?")) deleteMutation.mutate({ id: tpl.id });
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              {tpl.description && <p className="mt-2 font-manrope text-text-muted-custom text-xs">{tpl.description}</p>}
              <div className="mt-3 space-y-1">
                {tpl.questions?.map((q: any, i: number) => (
                  <div key={q.id} className="flex items-start gap-2 font-manrope text-text-main text-xs">
                    <span className="shrink-0 font-bold text-mentor-teal">{i + 1}.</span>
                    <span className="flex-1">{q.question}</span>
                    {q.questionType === "likert" && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-[8px] text-amber-700">
                        Likert
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-gray-100 border-t pt-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-manrope text-[10px]",
                    tpl.isActive ? "text-green-600" : "text-gray-400",
                  )}
                >
                  {tpl.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {tpl.isActive ? "Active" : "Inactive"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-mentor-teal text-xs"
                  onClick={() => setEditingTemplate(tpl)}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} template={null} />
      <TemplateFormDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
      />
    </div>
  );
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState(template?.type || "mentee_to_mentor");
  const [description, setDescription] = useState(template?.description || "");
  const [questions, setQuestions] = useState<{ question: string; questionType: string; likertOptions?: any }[]>(
    template?.questions?.map((q: any) => ({
      question: q.question,
      questionType: q.questionType || "text",
      likertOptions: q.likertOptions || null,
    })) || [
      { question: "", questionType: "text" },
      { question: "", questionType: "text" },
      { question: "", questionType: "text" },
    ],
  );

  const createMutation = useMutation(
    orpc.feedback.template.create.mutationOptions({
      onSuccess: () => {
        toast.success("Template created");
        queryClient.invalidateQueries({ queryKey: orpc.feedback.template.list.key() });
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.feedback.template.update.mutationOptions({
      onSuccess: () => {
        toast.success("Template updated");
        queryClient.invalidateQueries({ queryKey: orpc.feedback.template.list.key() });
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const validQuestions = questions.filter((q) => q.question.trim());
    if (validQuestions.length === 0) {
      toast.error("At least one question is required");
      return;
    }

    const items = validQuestions.map((q, i) => ({
      question: q.question.trim(),
      order: i + 1,
      questionType: (q.questionType || "text") as "text" | "likert",
      likertOptions:
        q.questionType === "likert"
          ? q.likertOptions || ["Sangat Kurang", "Kurang", "Cukup", "Baik", "Sangat Baik"]
          : undefined,
    }));

    if (template) {
      updateMutation.mutate({ id: template.id, name, description, questions: items });
    } else {
      createMutation.mutate({ name, type, description, questions: items });
    }
  };

  const addQuestion = () => setQuestions((prev) => [...prev, { question: "", questionType: "text" }]);
  const removeQuestion = (index: number) => setQuestions((prev) => prev.filter((_, i) => i !== index));
  const setQuestion = (index: number, value: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, question: value } : q)));
  const setQuestionType = (index: number, questionType: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...q,
              questionType,
              likertOptions:
                questionType === "likert"
                  ? q.likertOptions || ["Sangat Kurang", "Kurang", "Cukup", "Baik", "Sangat Baik"]
                  : undefined,
            }
          : q,
      ),
    );
  const setLikertOption = (qIndex: number, optionIndex: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              likertOptions: q.likertOptions?.map((opt: string, oi: number) => (oi === optionIndex ? value : opt)),
            }
          : q,
      ),
    );
  const addLikertOption = (qIndex: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, likertOptions: [...(q.likertOptions || []), ""] } : q)),
    );
  const removeLikertOption = (qIndex: number, optionIndex: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, likertOptions: q.likertOptions?.filter((_: any, oi: number) => oi !== optionIndex) } : q,
      ),
    );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template ? "Modify the feedback template." : "Define a new feedback template with questions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mentee Feedback" />
            </div>
            {!template && (
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => v && setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentee_to_mentor">Mentee → Mentor</SelectItem>
                    <SelectItem value="mentee_to_platform">Mentee → MulaiPlus</SelectItem>
                    <SelectItem value="mentor_to_platform">Mentor → MulaiPlus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this feedback template"
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label>Questions</Label>
            <div className="mt-2 space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 shrink-0 font-bold text-mentor-teal text-sm">{i + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={q.question}
                      onChange={(e) => setQuestion(i, e.target.value)}
                      placeholder={`Question ${i + 1}`}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuestionType(i, "text")}
                        className={cn(
                          "rounded-full px-3 py-1 font-manrope font-medium text-[10px] transition-colors",
                          q.questionType === "text"
                            ? "bg-mentor-teal text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        )}
                      >
                        Free Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionType(i, "likert")}
                        className={cn(
                          "rounded-full px-3 py-1 font-manrope font-medium text-[10px] transition-colors",
                          q.questionType === "likert"
                            ? "bg-mentor-teal text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        )}
                      >
                        Likert Scale
                      </button>
                    </div>
                    {q.questionType === "likert" && (
                      <div className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase">
                          Scale Options (1 = terendah)
                        </p>
                        {q.likertOptions?.map((opt: string, oi: number) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="w-4 shrink-0 font-manrope text-[10px] text-gray-400">{oi + 1}</span>
                            <Input
                              value={opt}
                              onChange={(e) => setLikertOption(i, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="h-7 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLikertOption(i, oi)}
                              className="h-6 w-6 shrink-0"
                              disabled={(q.likertOptions?.length || 0) <= 2}
                            >
                              <Trash className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addLikertOption(i)}
                          className="text-[10px] text-mentor-teal"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Option
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(i)}
                    className="mt-1 shrink-0"
                    disabled={questions.length <= 1}
                  >
                    <Trash className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addQuestion} className="rounded-full text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Question
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Manager ──────────────────────────────────────

function CampaignManager() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    ...orpc.feedback.campaign.list.queryOptions({ input: {} }),
  });

  const updateStatusMutation = useMutation(
    orpc.feedback.campaign.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.feedback.campaign.list.key() });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);

  const deleteMutation = useMutation(
    orpc.feedback.campaign.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign deleted");
        queryClient.invalidateQueries({ queryKey: orpc.feedback.campaign.list.key() });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-manrope text-sm text-text-muted-custom">
          {campaigns?.length || 0} campaign{(campaigns?.length || 0) !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setIsCreateOpen(true)} className="btn-mentor rounded-full">
          <Plus className="mr-2 h-4 w-4" /> Create Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-gray-200 border-dashed bg-white py-16">
          <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-manrope font-medium text-text-muted-custom">No campaigns yet</p>
          <p className="font-manrope text-text-muted-custom text-xs">Create a campaign to start collecting feedback.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp: any) => (
            <div
              key={camp.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold font-bricolage text-base text-text-main">{camp.template?.name}</h3>
                  <StatusBadge status={camp.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-manrope text-text-muted-custom text-xs">
                  <span>Batch: {camp.batch?.name}</span>
                  <span>·</span>
                  <span>Type: {feedbackTypeLabels[camp.template?.type] || camp.template?.type}</span>
                  <span>·</span>
                  <span>{camp.campaignType === "completion" ? "Completion" : "Periodic"}</span>
                  <span>·</span>
                  <span>
                    {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {camp.status === "scheduled" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: camp.id, status: "open" })}
                    className="rounded-full bg-green-600 text-white text-xs hover:bg-green-700"
                  >
                    Open Now
                  </Button>
                )}
                {camp.status === "open" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: camp.id, status: "closed" })}
                    variant="outline"
                    className="rounded-full text-xs"
                  >
                    Close
                  </Button>
                )}
                {(camp.status === "closed" || camp.status === "open") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingCampaign(camp)}
                    className="rounded-full text-xs"
                  >
                    <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                    Results
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => {
                    if (confirm("Delete this campaign?")) deleteMutation.mutate({ id: camp.id });
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCampaignDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {viewingCampaign && (
        <ViewResultsDialog
          campaign={viewingCampaign}
          open={!!viewingCampaign}
          onOpenChange={(open) => !open && setViewingCampaign(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-gray-100 text-gray-600" },
    open: { label: "Open", className: "bg-green-100 text-green-700" },
    closed: { label: "Closed", className: "bg-red-100 text-red-600" },
  };
  const c = config[status] || config.scheduled;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-manrope font-medium text-[10px]",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: templates } = useQuery(orpc.feedback.template.list.queryOptions());
  const { data: programs } = useQuery(orpc.programs.admin.list.queryOptions());

  const [templateId, setTemplateId] = useState("");
  const [programId, setProgramId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campaignType, setCampaignType] = useState<"completion" | "periodic">("completion");

  const { data: batches } = useQuery({
    ...orpc.programs.admin.batches.list.queryOptions({
      input: { programId },
    }),
    enabled: !!programId,
  });

  const createMutation = useMutation(
    orpc.feedback.campaign.create.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign created");
        queryClient.invalidateQueries({ queryKey: orpc.feedback.campaign.list.key() });
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleCreate = () => {
    if (!templateId || !batchId || !startDate || !endDate) {
      toast.error("All fields are required");
      return;
    }
    createMutation.mutate({ templateId, batchId, startDate, endDate, campaignType });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>Schedule a feedback campaign for a batch.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
              <SelectTrigger>
                <SelectValue
                  render={
                    <span className="text-left">
                      {(() => {
                        const t = templates?.find((t: any) => t.id === templateId);
                        return t ? `${t.name} (${feedbackTypeLabels[t.type]})` : null;
                      })()}
                    </span>
                  }
                  placeholder="Select template"
                />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({feedbackTypeLabels[t.type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Program</Label>
            <Select
              value={programId}
              onValueChange={(v) => {
                v && setProgramId(v);
                setBatchId("");
              }}
            >
              <SelectTrigger>
                <SelectValue
                  render={
                    <span className="text-left">
                      {programs?.data?.find((p: any) => p.id === programId)?.name || null}
                    </span>
                  }
                  placeholder="Select program"
                />
              </SelectTrigger>
              <SelectContent>
                {programs?.data?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={(v) => v && setBatchId(v)} disabled={!programId}>
              <SelectTrigger>
                <SelectValue
                  render={
                    <span className="text-left">{batches?.find((b: any) => b.id === batchId)?.name || null}</span>
                  }
                  placeholder="Select batch"
                />
              </SelectTrigger>
              <SelectContent>
                {batches?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campaign Type</Label>
            <Select value={campaignType} onValueChange={(v) => setCampaignType(v as "completion" | "periodic")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completion">Completion (wajib diisi, blocking download report)</SelectItem>
                <SelectItem value="periodic">Periodic (wajib diisi, tidak blocking)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Results Dialog ────────────────────────────────────

function ViewResultsDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: responses, isLoading } = useQuery({
    ...orpc.feedback.response.listByCampaign.queryOptions({
      input: { campaignId: campaign?.id ?? "" },
    }),
    enabled: !!campaign?.id && open,
  });

  // Transform to table format: rows = respondents, cols = questions
  const tableData = useMemo(() => {
    if (!responses || responses.length === 0) return { questions: [], rows: [] };

    const raw = responses as any[];

    // Get unique questions in order
    const questionMap = new Map<string, { question: string; questionType: string; likertOptions?: any }>();
    for (const r of raw) {
      if (!questionMap.has(r.questionId)) {
        questionMap.set(r.questionId, {
          question: r.question?.question || "Unknown",
          questionType: r.question?.questionType || "text",
          likertOptions: r.question?.likertOptions,
        });
      }
    }
    const questions = Array.from(questionMap.entries()).map(([id, info]) => ({ id, ...info }));

    // Group by respondent
    const respondentMap = new Map<string, { name: string; answers: Record<string, string>; toUser?: string }>();
    for (const r of raw) {
      const uid = r.fromUserId;
      if (!respondentMap.has(uid)) {
        respondentMap.set(uid, {
          name: r.fromUser?.name || r.fromUser?.email || "Anonymous",
          answers: {},
          toUser: r.toUser?.name,
        });
      }
      const entry = respondentMap.get(uid);
      if (entry) entry.answers[r.questionId] = r.answer;
    }

    const rows = Array.from(respondentMap.entries()).map(([uid, data]) => ({
      id: uid,
      ...data,
    }));

    return { questions, rows };
  }, [responses]);

  const uniqueRespondents = tableData.rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-brand-navy text-xl">
            Feedback Results — {campaign?.template?.name}
          </DialogTitle>
          <DialogDescription className="font-manrope">
            {campaign?.batch?.name} · {uniqueRespondents} respondent{uniqueRespondents !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
          </div>
        ) : tableData.rows.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <MessageSquare className="mb-4 h-10 w-10 text-gray-300" />
            <p className="font-manrope font-medium text-text-muted-custom">No responses yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full caption-bottom text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="h-10 whitespace-nowrap px-3 text-left font-medium text-foreground">Respondent</th>
                  {campaign?.template?.type === "mentee_to_mentor" && (
                    <th className="h-10 whitespace-nowrap px-3 text-left font-medium text-foreground">Mentor</th>
                  )}
                  {tableData.questions.map((q: any) => (
                    <th
                      key={q.id}
                      className="h-10 max-w-[250px] whitespace-nowrap px-3 text-left font-medium text-foreground"
                      title={q.question}
                    >
                      <span className="block flex items-center gap-1.5 truncate">
                        {q.question}
                        {q.questionType === "likert" && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-[8px] text-amber-700">
                            Likert
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row) => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap p-3 align-middle font-medium">{row.name}</td>
                    {campaign?.template?.type === "mentee_to_mentor" && (
                      <td className="whitespace-nowrap p-3 align-middle text-muted-foreground">{row.toUser || "—"}</td>
                    )}
                    {tableData.questions.map((q: any) => (
                      <td key={q.id} className="p-3 align-middle">
                        {q.questionType === "likert" && q.likertOptions ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-mentor-teal/10 px-2.5 py-1 font-manrope font-medium text-mentor-teal text-xs">
                            {row.answers[q.id]
                              ? q.likertOptions[Number(row.answers[q.id]) - 1] || row.answers[q.id]
                              : "—"}
                            <span className="text-[10px] opacity-60">({row.answers[q.id] || "—"})</span>
                          </span>
                        ) : (
                          <span className="line-clamp-3 block max-w-[300px] break-words">
                            {row.answers[q.id] || "—"}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
