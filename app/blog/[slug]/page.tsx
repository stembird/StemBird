"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Check,
  BookOpen,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  content: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  reading_time: number | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  excerpt: string | null;
  category: string | null;
  created_at: string;
  reading_time: number | null;
}

function estimateReadingTime(html: string): number {
  const words = html.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      // Only show published posts (gracefully handle missing status column)
      if (data?.status && data.status !== "published") {
        setPost(null);
        return;
      }
      setPost(data);

      // Fetch related posts by same category
      if (data?.category) {
        const { data: related } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("category", data.category)
          .neq("id", data.id)
          .order("created_at", { ascending: false })
          .limit(3);
        const enrichedRelated = (related || [])
          .filter((p: any) => !p.status || p.status === "published")
          .map((p: any) => ({
          ...p,
          reading_time: p.reading_time ?? estimateReadingTime(p.content || ""),
        }));
        setRelatedPosts(enrichedRelated);
      }
    } catch (error) {
      console.error("Error fetching blog post:", error);
      toast.error("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) fetchPost();
  }, [slug, fetchPost]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-24 flex-1 flex flex-col items-center justify-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Article not found</h2>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been moved.</p>
          <Link href="/blog" prefetch={true}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const ogImageUrl = `https://www.careersasa.co.ke/api/og/blog/${slug}`;
  const pageUrl = `https://www.careersasa.co.ke/blog/${slug}`;
  const readingTime = post.reading_time ?? estimateReadingTime(post.content || "");
  const shareText = encodeURIComponent(`${post.title} - CareerSasa Blog`);
  const shareUrl = encodeURIComponent(pageUrl);

  return (
    <>
      <Head>
        <title>{post.title} - CareerSasa Blog</title>
        <meta name="description" content={post.excerpt || post.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || post.title} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt || post.title} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Head>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <article className="flex-1">
          {/* Hero / Featured Image */}
          {post.featured_image && (
            <div className="relative w-full h-64 md:h-96 lg:h-[28rem] overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </div>
          )}

          <div className="container mx-auto px-4 max-w-3xl">
            {/* Back link */}
            <div className={`${post.featured_image ? "-mt-12 relative z-10" : "mt-8"}`}>
              <Link href="/blog" prefetch={true}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  All Articles
                </Button>
              </Link>
            </div>

            {/* Article Header */}
            <header className="mt-6 mb-10">
              {/* Breadcrumb-style category */}
              {post.category && (
                <div className="flex items-center gap-2 mb-4">
                  <Link href={`/blog?category=${encodeURIComponent(post.category)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                      {post.category}
                    </Badge>
                  </Link>
                </div>
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-6">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground pb-6 border-b border-border/60">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {readingTime} min read
                </span>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {post.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Share:</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Share on Facebook"
                >
                  <Facebook className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Share on Twitter"
                >
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href={`mailto:?subject=${shareText}&body=${shareUrl}`}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Share via Email"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </a>
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg hover:bg-muted transition-colors ml-auto"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </header>

            {/* Article Content */}
            <div
              className="richtext-content text-muted-foreground text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Article Footer */}
            <div className="mt-12 pt-8 border-t border-border/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="border-t border-border/60 bg-muted/20 mt-12">
              <div className="container mx-auto px-4 py-8 max-w-5xl">
                <h2 className="text-2xl font-bold mb-2">More in {post.category}</h2>
                <p className="text-muted-foreground mb-5 md:mb-6">Continue reading related articles</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {relatedPosts.map((rp) => (
                    <Link key={rp.id} href={`/blog/${rp.slug}`} prefetch={true}>
                      <article className="group h-full rounded-xl border border-border/60 bg-card hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
                        <div className="aspect-[16/9] overflow-hidden">
                          {rp.featured_image ? (
                            <img
                              src={rp.featured_image}
                              alt={rp.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-primary/15" />
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {rp.title}
                          </h3>
                          {rp.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{rp.excerpt}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
                            <span>{new Date(rp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rp.reading_time} min
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Comments Section */}
          <section className="container mx-auto px-4 py-12 max-w-3xl">
            <div className="border-t border-border/60 pt-10">
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Discussion
              </h2>
              <p className="text-muted-foreground text-sm mb-8">Share your thoughts on this article</p>
              <CommentsSection postId={post.id} />
            </div>
          </section>
        </article>

        <Footer />
      </div>
    </>
  );
}

function CommentsSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState({ name: "", email: "", comment: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("blog_comments")
        .select("*")
        .eq("post_id", postId)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.name || !newComment.email || !newComment.comment) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any).from("blog_comments").insert([
        {
          post_id: postId,
          author_name: newComment.name,
          author_email: newComment.email,
          content: newComment.comment,
          approved: false,
        },
      ]);

      if (error) throw error;

      toast.success("Comment submitted! It will appear after approval.");
      setNewComment({ name: "", email: "", comment: "" });
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to submit comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Comment Form */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <Input
                  type="text"
                  value={newComment.name}
                  onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <Input
                  type="email"
                  value={newComment.email}
                  onChange={(e) => setNewComment({ ...newComment, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Comment</label>
              <Textarea
                value={newComment.comment}
                onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                placeholder="Share your thoughts..."
                className="min-h-[120px] resize-none"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Comments are moderated before publishing.</p>
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? "Submitting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border/60">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </p>
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 rounded-xl border border-border/40 bg-card/50">
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {comment.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
