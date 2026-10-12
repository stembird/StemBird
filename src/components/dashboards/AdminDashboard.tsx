// Admin Dashboard Component
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase, Users, Trash2, FileText, Edit, BarChart, FileEdit, Search, Settings, UserCircle, Mail, MessageSquare, CheckCircle, ChevronLeft, ChevronRight, Star, TrendingUp, Rss, ImageIcon, Share2, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useAppSetting, setAppSetting } from "@/hooks/useAppSettings";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  created_at: string;
  employment_type: string;
  status: string;
  industry: string;
  posted_by: string;
  is_featured?: boolean | null;
  is_promoted?: boolean | null;
  promotion_tier?: string | null;
  education_levels?: {
    name: string;
  } | null | any;
}

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  // Joined from candidate_profiles (may be null for non-candidates)
  candidate_profiles: {
    id: string;
    current_title: string | null;
    location: string | null;
    phone: string | null;
    profile_completeness_score: number | null;
    profile_visibility: string | null;
  }[] | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  created_at: string;
  author_id: string | null;
  status: string;
  reading_time: number | null;
}

interface BlogComment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  approved: boolean;
  created_at: string;
  blog_posts: { title: string; slug: string } | null;
}

const AdminDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogComments, setBlogComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("all");
  const jobsPerPage = 10;
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const whatsappEnabled = useAppSetting('whatsapp_enabled');
  const [togglingWhatsapp, setTogglingWhatsapp] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate pagination
      const from = (currentPage - 1) * jobsPerPage;
      const to = from + jobsPerPage - 1;

      // Build job query with server-side search/filters
      const sb = supabase as any;
      let jobQuery = sb.from("jobs").select(`
          id, 
          title, 
          company, 
          location, 
          created_at, 
          employment_type, 
          status, 
          industry, 
          posted_by,
          is_featured,
          is_promoted,
          promotion_tier,
          education_levels (name)
        `)
        .order("is_featured", { ascending: false, nullsFirst: false })
        .order("is_promoted", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      // Search by title or company
      if (jobSearch.trim()) {
        jobQuery = jobQuery.or(`title.ilike.%${jobSearch.trim()}%,company.ilike.%${jobSearch.trim()}%`);
      }
      // Status filter
      if (jobStatusFilter !== "all") {
        jobQuery = jobQuery.eq("status", jobStatusFilter);
      }
      // Employment type filter
      if (jobTypeFilter !== "all") {
        jobQuery = jobQuery.eq("employment_type", jobTypeFilter);
      }

      // Count query mirrors filters
      let countQuery = sb.from("jobs").select("id", { count: "exact", head: true });
      if (jobSearch.trim()) {
        countQuery = countQuery.or(`title.ilike.%${jobSearch.trim()}%,company.ilike.%${jobSearch.trim()}%`);
      }
      if (jobStatusFilter !== "all") {
        countQuery = countQuery.eq("status", jobStatusFilter);
      }
      if (jobTypeFilter !== "all") {
        countQuery = countQuery.eq("employment_type", jobTypeFilter);
      }

      const jobsResult = await jobQuery.range(from, to);
      const jobsCountResult = await countQuery;

      // Fetch users from the admin API so we get real signup dates from
      // auth.users.created_at (user_profiles.created_at was backfilled).
      let usersData: AdminUser[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          usersData = (json.users || []) as AdminUser[];
        } else {
          console.error("Users API error:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
      setUsers(usersData);

      const [blogPostsResult, commentsResult] = await Promise.all([
        supabase.from("blog_posts").select("id, title, slug, category, created_at, author_id, status, reading_time").order("created_at", { ascending: false }),
        supabase.from("blog_comments").select("id, post_id, author_name, author_email, content, approved, created_at, blog_posts(title, slug)").order("created_at", { ascending: false }).limit(50),
      ]);

      if (jobsResult.error) {
        toast.error("Failed to load jobs");
        console.error("Jobs fetch error:", jobsResult.error);
      } else {
        setJobs(jobsResult.data || []);
      }

      if (jobsCountResult.count !== null) {
        setTotalJobs(jobsCountResult.count);
      }

      if (blogPostsResult.error) {
        toast.error("Failed to load blog posts");
        console.error("Blog posts fetch error:", blogPostsResult.error);
      } else {
        setBlogPosts(blogPostsResult.data || []);
      }

      if (commentsResult.error) {
        console.error("Comments fetch error:", commentsResult.error);
      } else {
        setBlogComments((commentsResult.data || []) as unknown as BlogComment[]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchData:", error);
      toast.error("An unexpected error occurred while loading data");
    } finally {
      setLoading(false);
    }
  }, [currentPage, jobsPerPage, jobSearch, jobStatusFilter, jobTypeFilter]);

  useEffect(() => {
    fetchData();
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchData]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);

      if (error) {
        toast.error("Failed to delete job");
        console.error("Job delete error:", error);
      } else {
        toast.success("Job deleted successfully");
        // Add a small delay before refreshing to prevent rate limiting
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (error) {
      console.error("Unexpected error deleting job:", error);
      toast.error("An unexpected error occurred while deleting the job");
    }
  };

  const handleDeleteBlogPost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", postId);

      if (error) {
        toast.error("Failed to delete blog post");
        console.error("Blog post delete error:", error);
      } else {
        toast.success("Blog post deleted successfully");
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (error) {
      console.error("Unexpected error deleting blog post:", error);
      toast.error("An unexpected error occurred while deleting the blog post");
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("blog_comments").update({ approved: true }).eq("id", commentId);
      if (error) throw error;
      toast.success("Comment approved");
      setBlogComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, approved: true } : c)));
    } catch (error) {
      console.error("Error approving comment:", error);
      toast.error("Failed to approve comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const { error } = await supabase.from("blog_comments").delete().eq("id", commentId);
      if (error) throw error;
      toast.success("Comment deleted");
      setBlogComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "active" })
        .eq("id", jobId);

      if (error) {
        toast.error("Failed to publish job");
        console.error("Job publish error:", error);
      } else {
        toast.success("Job published successfully!");
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (error) {
      console.error("Unexpected error publishing job:", error);
      toast.error("An unexpected error occurred while publishing the job");
    }
  };

  const filteredJobs = jobs; // server-side filtering now handles this

  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [jobSearch, jobStatusFilter, jobTypeFilter]);

  async function handleToggleWhatsapp(checked: boolean) {
    setTogglingWhatsapp(true);
    try {
      await setAppSetting('whatsapp_enabled', checked);
      toast.success(`WhatsApp button ${checked ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error('Failed to update setting: ' + err.message);
    } finally {
      setTogglingWhatsapp(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
          <Link href="/dashboard/content-editor">
            <Button variant="default" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
              <FileEdit className="mr-2 h-4 w-4" />
              Content & SEO
            </Button>
          </Link>
          <Link href="/blog/create">
            <Button variant="outline" className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              New Blog Post
            </Button>
          </Link>
          <Link href="/dashboard/admin/parse-job">
            <Button variant="outline" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Parse Job Text
            </Button>
          </Link>
          <Link href="/dashboard/admin/job-parser-stats">
            <Button variant="outline" className="w-full sm:w-auto">
              <BarChart className="mr-2 h-4 w-4" />
              Parser Stats
            </Button>
          </Link>
          <Link href="/dashboard/admin/emails">
            <Button variant="outline" className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Email Management
            </Button>
          </Link>
          <Link href="/dashboard/admin/scraper-sources">
            <Button variant="outline" className="w-full sm:w-auto">
              <Rss className="mr-2 h-4 w-4" />
              Scraper Sources
            </Button>
          </Link>
          <Link href="/dashboard/admin/social-publishing">
            <Button variant="outline" className="w-full sm:w-auto">
              <Share2 className="mr-2 h-4 w-4" />
              Social Publishing
            </Button>
          </Link>
          <Link href="/dashboard/admin/pricing">
            <Button variant="outline" className="w-full sm:w-auto">
              <Banknote className="mr-2 h-4 w-4" />
              Pricing & M-Pesa
            </Button>
          </Link>
          <Link href="/dashboard/admin/image-templates">
            <Button variant="outline" className="w-full sm:w-auto">
              <ImageIcon className="mr-2 h-4 w-4" />
              Image Templates
            </Button>
          </Link>
          <Link href="/post-job">
            <Button className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs">All Jobs</TabsTrigger>
          <TabsTrigger value="blog">Blog Posts</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                All Job Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search + Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or company\u2026"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Employment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                    <SelectItem value="VOLUNTEER">Volunteer</SelectItem>
                    <SelectItem value="PER_DIEM">Per Diem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : filteredJobs.length === 0 ? (
                <p className="text-muted-foreground">
                  {jobSearch || jobStatusFilter !== "all" || jobTypeFilter !== "all"
                    ? "No jobs match your search filters."
                    : "No jobs available."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link href={`/jobs/${job.id}`} className="hover:underline">
                                {job.title}
                              </Link>
                              {job.is_featured && (
                                <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0 gap-0.5">
                                  <Star className="h-2.5 w-2.5 fill-white" />
                                  Featured
                                </Badge>
                              )}
                              {job.is_promoted && (
                                <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 gap-0.5">
                                  <TrendingUp className="h-2.5 w-2.5" />
                                  Promoted{job.promotion_tier ? ` \u2022 ${job.promotion_tier}` : ''}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{job.company}</TableCell>
                          <TableCell>{job.location}</TableCell>
                          <TableCell>{job.education_levels?.name || 'Not specified'}</TableCell>
                          <TableCell>
                            <Badge variant={job.status === 'active' ? 'default' : job.status === 'draft' ? 'secondary' : 'outline'}>
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {job.status === "draft" && (
                                <>
                                  <Link href={`/post-job/${job.id}`}>
                                    <Button variant="outline" size="sm">Edit</Button>
                                  </Link>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handlePublishJob(job.id)}
                                  >
                                    Publish
                                  </Button>
                                </>
                              )}
                              {job.status === "active" && (
                                <Link href={`/post-job/${job.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteJob(job.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!loading && filteredJobs.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * jobsPerPage) + 1}–{Math.min(currentPage * jobsPerPage, totalJobs)} of {totalJobs}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {/* Scrollable page buttons */}
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[60vw] scrollbar-none">
                      {(() => {
                        const pages: (number | 'ellipsis')[] = [];
                        const tp = totalPages;
                        const cp = currentPage;
                        const windowSize = 2;
                        pages.push(1);
                        for (let i = cp - windowSize; i <= cp + windowSize; i++) {
                          if (i > 1 && i < tp) pages.push(i);
                        }
                        if (tp > 1) pages.push(tp);
                        // Sort & deduplicate
                        const unique = [...new Set(pages)].sort((a, b) => (a as number) - (b as number));
                        return unique.map((page, idx) => {
                          const prev = unique[idx - 1];
                          const showEllipsis = prev !== undefined && (page as number) - (prev as number) > 1;
                          return (
                            <div key={page} className="flex items-center shrink-0">
                              {showEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page as number)}
                                className="min-w-[36px] px-2"
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog">
          <div className="space-y-6">
            {/* Blog Posts Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Blog Posts
                    <Badge variant="outline" className="ml-2">{blogPosts.length}</Badge>
                  </CardTitle>
                  <Link href="/blog/create">
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      New Post
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : blogPosts.length === 0 ? (
                  <p className="text-muted-foreground">No blog posts yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reading Time</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blogPosts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium max-w-[280px] truncate">
                              <Link href={`/blog/${post.slug}`} className="hover:underline">
                                {post.title}
                              </Link>
                            </TableCell>
                            <TableCell>{post.category || <span className="text-muted-foreground">None</span>}</TableCell>
                            <TableCell>
                              <Badge variant={post.status === 'published' ? 'default' : post.status === 'draft' ? 'secondary' : 'outline'}>
                                {post.status || 'published'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{post.reading_time ? `${post.reading_time} min` : '—'}</TableCell>
                            <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/blog/edit/${post.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteBlogPost(post.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                  <Badge variant="outline" className="ml-2">
                    {blogComments.filter((c) => !c.approved).length} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : blogComments.length === 0 ? (
                  <p className="text-muted-foreground">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {blogComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${comment.approved ? 'border-border/40 bg-card/30' : 'border-amber-200/60 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-900/10'}`}
                      >
                        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-sm">{comment.author_name}</span>
                            {comment.approved ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Approved</Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Pending</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              on &quot;{comment.blog_posts?.title || 'Unknown post'}&quot;
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comment.author_email} · {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!comment.approved && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleApproveComment(comment.id)} title="Approve">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteComment(comment.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users
                  <Badge variant="outline" className="ml-2">{users.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground">No users available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Current Title</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const cp = user.candidate_profiles?.[0] ?? null;
                        const displayName =
                          [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
                          user.full_name;
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={displayName || 'User'}
                                    className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                                  />
                                ) : (
                                  <UserCircle className="h-9 w-9 text-muted-foreground" />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm leading-tight">
                                    {displayName || <span className="text-muted-foreground italic">No name</span>}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                    {user.email || user.id}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {user.first_name || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {user.last_name || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {user.phone || cp?.phone || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'employer' ? 'outline' : 'secondary'}>
                                {user.role || 'candidate'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {cp?.current_title || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {cp?.location || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {cp ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        (cp.profile_completeness_score ?? 0) >= 70 ? 'bg-green-500'
                                          : (cp.profile_completeness_score ?? 0) >= 40 ? 'bg-yellow-500'
                                          : 'bg-red-400'
                                      }`}
                                      style={{ width: `${cp.profile_completeness_score ?? 0}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-7 text-right">
                                    {cp.profile_completeness_score ?? 0}%
                                  </span>
                                  <Badge
                                    variant={cp.profile_visibility === 'public' ? 'default' : 'secondary'}
                                    className="text-[10px] px-1.5"
                                  >
                                    {cp.profile_visibility || 'private'}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No profile</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Feature Settings
              </CardTitle>
              <CardDescription>
                Toggle site-wide features on or off. Changes take effect immediately for all users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">WhatsApp Floating Button</Label>
                  <p className="text-sm text-muted-foreground">
                    Show or hide the WhatsApp chat button that appears on all pages.
                    Disable this when the number is unavailable or during maintenance.
                  </p>
                </div>
                <Switch
                  checked={whatsappEnabled ?? true}
                  onCheckedChange={handleToggleWhatsapp}
                  disabled={togglingWhatsapp || whatsappEnabled === null}
                  aria-label="Toggle WhatsApp button"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;