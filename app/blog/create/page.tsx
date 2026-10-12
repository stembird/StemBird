"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, FileText, ImagePlus, Tag, Hash, AlignLeft, BookOpen } from "lucide-react";
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

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user } = useAuth();
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
    status: "draft" as "draft" | "published",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("blog_categories")
        .select("id, name, slug")
        .order("name");
      if (data) setCategories(data);
    } catch (e) {
      // Categories are optional; silently fail
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
      const postData = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        featured_image: formData.featured_image || null,
        content: formData.content,
        excerpt: formData.excerpt || null,
        category: formData.category || null,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        status: formData.status,
        author_id: user?.id,
        reading_time: readingTime,
        published_at: formData.status === "published" ? new Date().toISOString() : null,
      };

      const { error } = await supabase.from("blog_posts").insert([postData]);

      if (error) throw error;
      toast.success(
        formData.status === "published" ? "Blog post published!" : "Draft saved successfully!"
      );
      router.push("/blog");
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("Failed to create blog post");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h1 className="text-3xl font-bold">Write a New Article</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Share insights, tips, or career stories with the community
              </p>
            </div>
          </div>
          <Badge variant={formData.status === "published" ? "default" : "secondary"} className="text-sm px-3 py-1">
            {formData.status === "published" ? "Ready to Publish" : "Draft"}
          </Badge>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title: e.target.value,
                          slug: formData.slug || generateSlug(e.target.value),
                        })
                      }
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
                      placeholder="A brief summary that appears on the blog listing (1-2 sentences)"
                      className="min-h-[80px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.excerpt.length}/160 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Content Editor */}
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
                      onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Save as Draft</SelectItem>
                        <SelectItem value="published">Publish Now</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : formData.status === "published" ? (
                        "Publish Article"
                      ) : (
                        "Save Draft"
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/blog")}
                  >
                    Cancel
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
                <CardContent className="space-y-3">
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

              {/* Slug (advanced) */}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-generated from title. Edit to customize.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
