"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, FileText, ImagePlus, Tag, Hash, AlignLeft, BookOpen, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
});

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    featured_image: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
    status: "draft" as string,
  });

  useEffect(() => {
    fetchCategories();
    const fetchBlogPost = async () => {
      try {
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title || "",
            slug: data.slug || "",
            featured_image: data.featured_image || "",
            content: data.content || "",
            excerpt: data.excerpt || "",
            category: data.category || "",
            tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
            status: data.status || "published",
          });
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
        toast.error("Failed to load blog post");
        router.push("/blog");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) fetchBlogPost();
  }, [params.id, router]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from("blog_categories").select("id, name, slug").order("name");
      if (data) setCategories(data);
    } catch (e) {
      // Categories are optional
    }
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const wordCount = formData.content
    ? formData.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error("Please fill in the title and content");
      return;
    }

    setIsSubmitting(true);

    try {
      const postData: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        featured_image: formData.featured_image || null,
        content: formData.content,
        excerpt: formData.excerpt || null,
        category: formData.category || null,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        status: formData.status,
        reading_time: readingTime,
        updated_at: new Date().toISOString(),
      };

      if (formData.status === "published") {
        postData.published_at = new Date().toISOString();
      }

      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const { error } = await supabase.from("blog_posts").update(postData).eq("id", id);

      if (error) throw error;
      toast.success("Blog post updated successfully!");
      router.push("/blog");
    } catch (error) {
      console.error("Error updating blog post:", error);
      toast.error("Failed to update blog post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this blog post? This cannot be undone.")) return;
    try {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Blog post deleted");
      router.push("/blog");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete blog post");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading blog post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/blog")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Article</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Update your blog post content and settings
              </p>
            </div>
          </div>
          <Badge
            variant={formData.status === "published" ? "default" : "secondary"}
            className="text-sm px-3 py-1"
          >
            {formData.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/60">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="title" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., 10 Interview Tips That Actually Work"
                      className="text-lg h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="excerpt" className="flex items-center gap-2 mb-2 text-sm font-semibold">
                      <AlignLeft className="h-4 w-4" />
                      Excerpt
                    </Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="A brief summary that appears on the blog listing"
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="pt-6">
                  <Label className="flex items-center gap-2 mb-3 text-sm font-semibold">
                    <BookOpen className="h-4 w-4" />
                    Content
                    <span className="text-xs font-normal text-muted-foreground ml-auto">
                      {wordCount} words · {readingTime} min read
                    </span>
                  </Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder="Write your blog post content here..."
                    className="min-h-[400px]"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publish Settings */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Publish
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Article"
                    )}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/blog")}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Article
                  </Button>
                </CardContent>
              </Card>

              {/* Category */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categories.length > 0 ? (
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Career Tips"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="career, jobs, tips"
                  />
                  <p className="text-xs text-muted-foreground">Separate tags with commas</p>
                </CardContent>
              </Card>

              {/* Featured Image */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={formData.featured_image}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.featured_image && (
                    <div className="aspect-video rounded-lg overflow-hidden border border-border/60">
                      <img
                        src={formData.featured_image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Slug */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-sm text-muted-foreground">URL Slug</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated-from-title"
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
