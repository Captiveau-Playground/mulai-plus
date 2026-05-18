"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
    resolver: zodResolver(articleSchema) as any,
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

  // Watched content for live preview
  const watchedContent = form.watch("content") || "";
  const previewHtml = useMemo(
    () =>
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,-apple-system,sans-serif;padding:16px;line-height:1.7;color:#1a1a2e;max-width:100%;word-wrap:break-word;font-size:15px}img,video{max-width:100%;height:auto}h1{font-size:1.6em;margin:.5em 0}h2{font-size:1.3em}h3{font-size:1.1em}p{margin:0 0 .8em}blockquote{border-left:3px solid #e2e8f0;padding-left:1em;margin-left:0;color:#64748b}a{color:#2563eb}pre{background:#f1f5f9;padding:12px;border-radius:8px;overflow-x:auto}code{font-size:.9em}</style></head><body>${watchedContent || '<p style="color:#94a3b8;font-style:italic">Start writing to see preview…</p>'}</body></html>`,
    [watchedContent],
  );

  // Auto-save draft every 3s
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
  }, [restoreDraft, form.reset, articleId]);
  useEffect(() => {
    if (article && (article as any).id) {
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
          ? (typeof art.scheduledAt === "string" ? new Date(art.scheduledAt) : art.scheduledAt)
              .toISOString()
              .slice(0, 16)
          : "",
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
          <a href="/admin/cms/articles">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </a>
          <div>
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight">
              {articleId ? "Edit Article" : "New Article"}
            </h2>
            <p className="font-manrope text-sm text-text-muted-custom">
              {articleId ? "Update your article content and settings" : "Create a new article or news item"}
              {draftSavedAt && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 text-xs">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Draft saved {new Date(draftSavedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(article as any)?.slug && (
            <a href={`/articles/${(article as any).slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
            </a>
          )}
          <Button
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Save className="mr-2 h-4 w-4" /> Save
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
            {/* Content Tab */}
            <TabsContent value="content" className="mt-4 space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter article title" {...field} className="font-medium text-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="min-h-[500px]">
                              <RichTextEditor
                                content={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Start writing your article..."
                                minHeight="500px"
                              />
                            </div>
                            <div className="overflow-hidden rounded-lg border bg-white">
                              <div className="border-b px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                                Preview
                              </div>
                              <iframe
                                title="Content preview"
                                srcDoc={previewHtml}
                                className="h-[500px] w-full border-0"
                                sandbox="allow-same-origin"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="article-slug" {...field} />
                          </FormControl>
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
                            className="min-h-[100px]"
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
                      <FormItem>
                        <FormLabel>Cover Image</FormLabel>
                        <FormControl>
                          <FileUpload value={field.value} onChange={field.onChange} bucket="cms" path="articles" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                              <SelectValue placeholder="Select author" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {authors?.map((author: any) => (
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
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat: any) => (
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
                      {tags?.map((tag: any) => (
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
