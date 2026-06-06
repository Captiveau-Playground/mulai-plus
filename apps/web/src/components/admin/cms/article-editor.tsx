"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Maximize2, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormDraft } from "@/hooks/use-form-draft";
import { client, orpc } from "@/utils/orpc";
import { RichTextEditor } from "./rich-text-editor";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().optional(),
  coverImageAlt: z.string().optional(),
  type: z.enum(["news", "article"]),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  authorUserId: z.string().optional(),
  categoryId: z.string().optional(),
  featured: z.boolean().default(false),
  scheduledAt: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

type CmsArticleType = "news" | "article";
type CmsArticleStatus = "draft" | "scheduled" | "published" | "archived";

interface ArticleEditorProps {
  articleId?: string;
  defaultType?: CmsArticleType;
}

export function ArticleEditor({ articleId, defaultType = "article" }: ArticleEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("content");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Fetch categories
  const { data: categories } = useQuery(orpc.cms.categories.admin.list.queryOptions());

  // Fetch authors
  const { data: authors } = useQuery(
    orpc.cms.authors.admin.list.queryOptions({
      roles: ["mentor", "program_manager"],
    }),
  );

  // Fetch tags
  const { data: tags } = useQuery(orpc.cms.tags.admin.list.queryOptions());

  // Fetch article if editing — raw client bypass queryOptions empty body bug
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ["article", "get", articleId],
    queryFn: async () => {
      if (!articleId) return null;
      return await client.cms.articles.admin.get({ id: articleId });
    },
    enabled: Boolean(articleId),
  });

  // Create mutation
  const createMutation = useMutation(
    orpc.cms.articles.admin.create.mutationOptions({
      onSuccess: ({ id }) => {
        toast.success("Article created");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
        router.push(`/admin/cms/articles/${id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Update mutation
  const updateMutation = useMutation(
    orpc.cms.articles.admin.update.mutationOptions({
      onSuccess: () => {
        toast.success("Article saved");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<ArticleFormValues>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver type mismatch between zod v4 and hookform
    resolver: standardSchemaResolver(articleSchema) as any,
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      coverImageUrl: "",
      coverImageAlt: "",
      type: defaultType,
      status: "draft",
      authorUserId: "",
      categoryId: "",
      featured: false,
      scheduledAt: "",
      tagIds: [],
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      robots: "",
    },
  });

  const { draftSavedAt, restoreDraft, clearDraft, useAutoSave } = useFormDraft(articleId);

  // Watch title & slug for auto-slug generation
  const watchedTitle = form.watch("title") || "";
  const watchedSlug = form.watch("slug") || "";

  // Auto-generate slug from title when slug is empty (only for new articles)
  useEffect(() => {
    if (!articleId && watchedTitle && !watchedSlug) {
      form.setValue("slug", slugify(watchedTitle));
    }
  }, [watchedTitle, watchedSlug, articleId, form]);

  // Watched content for live preview
  const watchedContent = form.watch("content") || "";
  useAutoSave(
    () => form.getValues(),
    activeTab,
    !articleId, // only auto-save for new articles
  );

  // Restore draft on mount for new articles
  useEffect(() => {
    if (articleId) return;
    const draft = restoreDraft();
    if (draft?.values && Object.keys(draft.values).length > 0) {
      const hasContent = draft.values.title || draft.values.content;
      if (hasContent) {
        form.reset(draft.values as ArticleFormValues);
        if (draft.values.tagIds) {
          setSelectedTagIds(draft.values.tagIds as string[]);
        }
        toast.info("Draft restored", { description: `Last saved ${new Date(draft.savedAt).toLocaleTimeString()}` });
      }
    }
    // Only run on mount for new articles
  }, [articleId, restoreDraft, form.reset]);
  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic article shape from API
    if (article && (article as any).id) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic article shape from API
      const art = article as any;
      const values: ArticleFormValues = {
        title: art.title ?? "",
        slug: art.slug ?? "",
        content: art.content || "",
        excerpt: art.excerpt || "",
        coverImageUrl: art.coverImageUrl || "",
        coverImageAlt: art.coverImageAlt || "",
        type: art.type as CmsArticleType,
        status: art.status as CmsArticleStatus,
        authorUserId: art.author?.userId ?? "",
        categoryId: art.categoryId || "",
        featured: art.featured ?? false,
        scheduledAt: art.scheduledAt
          ? (() => {
              const d = typeof art.scheduledAt === "string" ? new Date(art.scheduledAt) : art.scheduledAt;
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })()
          : "",
        // biome-ignore lint/suspicious/noExplicitAny: tag type from API
        tagIds: art.tags?.map((t: any) => t.tagId) || [],
        metaTitle: art.seo?.metaTitle || "",
        metaDescription: art.seo?.metaDescription || "",
        metaKeywords: art.seo?.metaKeywords || "",
        ogImageUrl: art.seo?.ogImageUrl || "",
        canonicalUrl: art.seo?.canonicalUrl || "",
        robots: art.seo?.robots || "",
      };
      form.reset(values);
      setSelectedTagIds(values.tagIds || []);
    }
  }, [article, form]);

  const onSubmit = (values: ArticleFormValues) => {
    // Strip empty strings that should be undefined
    const cleanValues = { ...values };
    if (!cleanValues.authorUserId || cleanValues.authorUserId.trim() === "") {
      delete cleanValues.authorUserId;
    }
    if (cleanValues.slug === "") delete cleanValues.slug;

    const payload = {
      ...cleanValues,
      tagIds: selectedTagIds,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
    };

    const onSuccess = () => clearDraft();

    if (articleId) {
      updateMutation.mutate({ id: articleId, ...payload }, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  };

  if (articleId && isLoadingArticle) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/cms/articles")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">
              {articleId ? "Edit Article" : "New Article"}
            </h2>
            <p className="font-manrope text-sm text-text-muted-custom">
              {articleId ? "Update your article content and settings" : "Create a new article or news item"}
            </p>
            {draftSavedAt && (
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 shadow-sm">
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="font-medium text-amber-800 text-xs">
                  Draft auto-saved {new Date(draftSavedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* biome-ignore lint/suspicious/noExplicitAny: dynamic article shape */}
          {(article as any)?.slug && (
            /* biome-ignore lint/suspicious/noExplicitAny: dynamic article shape */
            <a href={`/articles/${(article as any).slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" title="Open live page">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">
            Content
            {!form.getValues().title && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
            {!form.getValues().authorUserId && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            {/* Content Tab — editor kiri, live preview kanan */}
            <TabsContent value="content" className="mt-0 space-y-0">
              <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1fr_420px]">
                {/* ── Left: Editor ── */}
                <div className="min-w-0 py-4 pr-0 xl:pr-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <FormControl>
                          <input
                            {...field}
                            placeholder="Tulis judul artikel..."
                            className="w-full border-0 bg-transparent p-0 font-bold font-bricolage text-3xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mb-6 border-t" />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor
                            content={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Mulai menulis..."
                            minHeight="600px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Meta section */}
                  <details className="group mt-8 rounded-xl border p-4">
                    <summary className="flex cursor-pointer items-center gap-2 font-medium text-muted-foreground text-sm hover:text-foreground">
                      <svg
                        className="h-4 w-4 transition-transform group-open:rotate-90"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Meta artikel &amp; cover
                    </summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <div className="flex gap-2">
                              <FormControl className="flex-1">
                                <Input placeholder="article-slug" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 shrink-0 gap-1.5 rounded-xl"
                                onClick={() => {
                                  const title = form.getValues("title");
                                  if (title) {
                                    form.setValue("slug", slugify(title));
                                  }
                                }}
                                title="Generate slug from title"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Generate
                              </Button>
                            </div>
                            <FormDescription>URL-friendly version of the title</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="excerpt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Excerpt</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief summary of the article..."
                                {...field}
                                className="min-h-[80px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="coverImageUrl"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Cover Image</FormLabel>
                            <FormControl>
                              <FileUpload value={field.value} onChange={field.onChange} bucket="cms" path="articles" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </details>
                </div>

                {/* ── Right: Live Preview Panel ── */}
                <div className="hidden border-l bg-muted/30 xl:block">
                  <div className="sticky top-0 flex h-[calc(100vh-8rem)] flex-col">
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1A1F6D]/10">
                        <Eye className="h-3.5 w-3.5 text-[#1A1F6D]" />
                      </div>
                      <span className="font-manrope font-semibold text-[#888888] text-xs uppercase tracking-wider">
                        Live Preview
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-5">
                        {/* Cover */}
                        {form.watch("coverImageUrl") && (
                          <div className="mb-6 overflow-hidden rounded-lg">
                            {/* biome-ignore lint/performance/noImgElement: preview panel uses dynamic URL */}
                            <img src={form.watch("coverImageUrl")} alt="" className="w-full object-cover" />
                          </div>
                        )}
                        {/* Title */}
                        <h1 className="mb-3 font-bold font-bricolage text-xl leading-tight tracking-tight">
                          {form.watch("title") || "Judul Artikel"}
                        </h1>
                        {/* Excerpt */}
                        {form.watch("excerpt") && (
                          <p className="mb-5 font-manrope text-muted-foreground text-sm leading-relaxed">
                            {form.watch("excerpt")}
                          </p>
                        )}
                        {/* Preview content styles */}
                        <style>{`
                          .preview-content h1 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
                          .preview-content h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; line-height: 1.35; }
                          .preview-content h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
                          .preview-content p { margin: 0 0 0.875rem; line-height: 1.7; color: #374151; font-size: 0.875rem; }
                          .preview-content ul, .preview-content ol { margin: 0 0 0.875rem; padding-left: 1.25rem; }
                          .preview-content li { margin-bottom: 0.25rem; line-height: 1.6; font-size: 0.875rem; }
                          .preview-content blockquote { border-left: 3px solid #e5e7eb; margin: 0 0 0.875rem; padding: 0.5rem 1rem; color: #6b7280; font-style: italic; }
                          .preview-content pre { background: #f3f4f6; border-radius: 0.5rem; padding: 0.75rem; overflow-x: auto; margin: 0 0 0.875rem; font-size: 0.8rem; }
                          .preview-content code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8rem; }
                          .preview-content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
                          .preview-content table { width: 100%; border-collapse: collapse; margin: 0 0 0.875rem; font-size: 0.8rem; }
                          .preview-content th, .preview-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
                          .preview-content th { background: #f9fafb; font-weight: 600; }
                          .preview-content a { color: #2563eb; text-decoration: underline; }
                          .preview-content iframe { max-width: 100%; border-radius: 0.5rem; margin: 0.75rem 0; }
                        `}</style>
                        {/* Rendered content */}
                        <LivePreviewContent html={watchedContent} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select author">
                                {field.value && authors
                                  ? (authors.find((a) => a.id === field.value)?.name ?? field.value)
                                  : "Select author"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {authors?.map((author) => (
                              <SelectItem key={author.id} value={author.id}>
                                {author.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category">
                                {field.value && categories
                                  ? (categories.find((c) => c.id === field.value)?.name ?? field.value)
                                  : "Select category"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription>Schedule publication for a specific time</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Featured</FormLabel>
                          <FormDescription>Show this article in featured sections</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div className="space-y-2">
                    <span className="font-medium text-sm">Tags</span>
                    <div className="flex min-h-[100px] flex-wrap gap-2 rounded-lg border p-3">
                      {tags?.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setSelectedTagIds((prev) =>
                              prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                            );
                          }}
                          className={`rounded-full px-3 py-1 text-xs transition-colors ${
                            selectedTagIds.includes(tag.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {(!tags || tags.length === 0) && (
                        <span className="text-muted-foreground text-sm">No tags available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO title (leave empty to use article title)" {...field} />
                        </FormControl>
                        <FormDescription>
                          {form.watch("metaTitle")?.length || form.watch("title").length || 0}/60 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description for search engines..."
                            {...field}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormDescription>{form.watch("metaDescription")?.length || 0}/160 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Keywords</FormLabel>
                        <FormControl>
                          <Input placeholder="keyword1, keyword2, keyword3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ogImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Social Share Image</FormLabel>
                        <FormControl>
                          <FileUpload value={field.value} onChange={field.onChange} bucket="cms" path="og-images" />
                        </FormControl>
                        <FormDescription>Recommended: 1200x630px</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="canonicalUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canonical URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="robots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Robots Meta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "index, follow"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="index, follow">Index, Follow</SelectItem>
                            <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                            <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                            <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}

/** Separate component to render HTML content without biome lint errors */
function LivePreviewContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML =
        html ||
        '<p style="color:#94a3b8;font-style:italic;font-size:0.875rem">Mulai menulis untuk melihat preview...</p>';
    }
  }, [html]);

  return <div ref={ref} className="preview-content" />;
}
