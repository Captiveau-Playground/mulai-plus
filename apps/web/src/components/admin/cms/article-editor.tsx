"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { orpc } from "@/utils/orpc";
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
  authorId: z.string().min(1, "Author is required"),
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
  const { data: authors } = useQuery(orpc.cms.authors.admin.list.queryOptions());

  // Fetch tags
  const { data: tags } = useQuery(orpc.cms.tags.admin.list.queryOptions());

  // Fetch article if editing
  const articleQuery = orpc.cms.articles.admin.get.queryOptions({ id: articleId ?? "" } as any);
  const { data: article, isLoading: isLoadingArticle } = useQuery({ ...articleQuery });

  // Create mutation
  const createMutation = useMutation(
    orpc.cms.articles.admin.create.mutationOptions({
      onSuccess: ({ id }) => {
        toast.success("Article created");
        queryClient.invalidateQueries({ queryKey: orpc.cms.articles.admin.list.key() });
        // @ts-expect-error - dynamic route typing
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
      authorId: "",
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

  // Set form values when article is loaded
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
        authorId: art.authorId ?? "",
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
    const payload = {
      ...values,
      tagIds: selectedTagIds,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
    };

    if (articleId) {
      updateMutation.mutate({ id: articleId, ...payload });
    } else {
      createMutation.mutate(payload);
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
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                          <RichTextEditor
                            content={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Start writing your article..."
                            minHeight="500px"
                          />
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
                    name="authorId"
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
