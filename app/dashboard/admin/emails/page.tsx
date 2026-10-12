"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Send, Users, BarChart3, FileText, Plus,
  Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Eye, Trash2,
  Radio, Settings2, Play, LayoutTemplate, Save
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";

// =====================================================
// TYPES
// =====================================================

interface EmailStats {
  total_sent: number;
  total_failed: number;
  total_bounced: number;
  subscribers_confirmed: number;
  subscribers_pending: number;
  campaigns_total: number;
  campaigns_sent: number;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  provider: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

interface Campaign {
  id: string;
  title: string;
  subject: string;
  status: string;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

interface EmailTemplate {
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  html_body: string;
  placeholders: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  updated_at: string | null;
  storage: string;
}

// =====================================================
// COMPONENT
// =====================================================

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Campaign form
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");

  // Test email
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  // Broadcast
  const [broadcastRole, setBroadcastRole] = useState("");
  const [broadcastLocation, setBroadcastLocation] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastSubjectB, setBroadcastSubjectB] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countingRecipients, setCountingRecipients] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Automations
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);

  // Templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLogs(), fetchSubscribers(), fetchCampaigns()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === "automations" && automationRules.length === 0) {
      fetchAutomations();
    }
    if (activeTab === "templates" && emailTemplates.length === 0) {
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---- Data fetching ----

  async function fetchStats() {
    const { data, error } = await (supabase as any).rpc("get_email_stats");
    if (!error && data) setStats(data);
  }

  async function fetchLogs() {
    const { data, error } = await (supabase as any)
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setLogs(data);
  }

  async function fetchSubscribers() {
    const { data, error } = await (supabase as any)
      .from("email_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setSubscribers(data);
  }

  async function fetchCampaigns() {
    const { data, error } = await (supabase as any)
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setCampaigns(data);
  }

  // ---- Auth helper ----
  async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // ---- Actions ----

  async function handleSendTest() {
    if (!testEmail) {
      toast.error("Enter a test email address");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch("/api/emails/test", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || data.error);
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleCreateCampaign() {
    if (!campaignTitle || !campaignSubject || !campaignBody) {
      toast.error("All fields are required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await (supabase as any).from("email_campaigns").insert({
        title: campaignTitle,
        subject: campaignSubject,
        html_body: campaignBody,
        status: "draft",
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Campaign created as draft");
      setCampaignTitle("");
      setCampaignSubject("");
      setCampaignBody("");
      fetchCampaigns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(msg);
    }
  }

  async function handleSendCampaign(campaignId: string) {
    if (!confirm("Send this campaign to all confirmed subscribers?")) return;
    setSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent to ${data.sent} recipients (${data.failed} failed)`);
        fetchCampaigns();
        fetchStats();
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteSubscriber(id: string) {
    if (!confirm("Remove this subscriber?")) return;
    try {
      const res = await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error("Failed to remove subscriber");
      } else {
        toast.success("Subscriber removed");
        fetchSubscribers();
        fetchStats();
      }
    } catch {
      toast.error("Failed to remove subscriber");
    }
  }

  // ---- Broadcast handlers ----

  async function countRecipients() {
    setCountingRecipients(true);
    try {
      const params = new URLSearchParams();
      if (broadcastRole) params.set('role', broadcastRole);
      if (broadcastLocation) params.set('location', broadcastLocation);
      const res = await fetch(`/api/emails/broadcast?${params}`, {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      setRecipientCount(data.count ?? 0);
    } catch {
      toast.error("Failed to count recipients");
    } finally {
      setCountingRecipients(false);
    }
  }

  async function handleBroadcast() {
    if (!broadcastSubject || !broadcastBody) {
      toast.error("Subject and body are required");
      return;
    }
    if (!recipientCount || recipientCount === 0) {
      toast.error("No recipients match the filters. Click 'Count' first.");
      return;
    }
    if (!confirm(`Send broadcast to ${recipientCount} recipients?`)) return;

    setBroadcasting(true);
    try {
      const res = await fetch("/api/emails/broadcast", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          subject: broadcastSubject,
          html_body: broadcastBody,
          subject_b: broadcastSubjectB || undefined,
          filters: {
            role: broadcastRole || undefined,
            location: broadcastLocation || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Broadcast sent to ${data.sent} recipients`);
        setBroadcastSubject("");
        setBroadcastBody("");
        setBroadcastSubjectB("");
        fetchCampaigns();
        fetchStats();
      } else {
        toast.error(data.error || "Failed to send broadcast");
      }
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setBroadcasting(false);
    }
  }

  // ---- Automation handlers ----

  async function fetchAutomations() {
    setLoadingAutomations(true);
    const { data, error } = await (supabase as any)
      .from("email_automation_rules")
      .select("*")
      .order("created_at");
    if (!error && data) setAutomationRules(data);
    setLoadingAutomations(false);
  }

  async function fetchTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      const templates = (data.templates ?? []) as EmailTemplate[];
      setEmailTemplates(templates);
      if (templates.length > 0 && !selectedTemplateSlug) {
        selectTemplate(templates[0]);
      } else if (selectedTemplateSlug) {
        const current = templates.find((t) => t.slug === selectedTemplateSlug);
        if (current) selectTemplate(current);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load templates";
      toast.error(msg);
    } finally {
      setLoadingTemplates(false);
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedTemplateSlug(template.slug);
    setEditName(template.name);
    setEditDescription(template.description ?? "");
    setEditSubject(template.subject);
    setEditHtml(template.html_body);
  }

  async function handleSaveTemplate() {
    if (!selectedTemplateSlug) return;
    if (!editName.trim() || !editSubject.trim() || !editHtml.trim()) {
      toast.error("Name, subject, and HTML body are required");
      return;
    }
    setSavingTemplate(true);
    try {
      const existing = emailTemplates.find((t) => t.slug === selectedTemplateSlug);
      const res = await fetch(`/api/admin/email-templates/${selectedTemplateSlug}`, {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          subject: editSubject.trim(),
          html_body: editHtml,
          placeholders: existing?.placeholders,
          metadata: existing?.metadata,
          is_active: existing?.is_active ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      toast.success("Template saved");
      const updated = data.template as EmailTemplate;
      setEmailTemplates((prev) =>
        prev.map((t) => (t.slug === updated.slug ? updated : t)),
      );
      selectTemplate(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save template";
      toast.error(msg);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function toggleAutomation(id: string, enabled: boolean) {
    await (supabase as any)
      .from("email_automation_rules")
      .update({ enabled })
      .eq("id", id);
    fetchAutomations();
  }

  // ---- Status badges ----

  function statusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      delivered: "default",
      failed: "destructive",
      bounced: "destructive",
      confirmed: "default",
      pending: "secondary",
      unsubscribed: "outline",
      draft: "secondary",
      sending: "secondary",
      scheduled: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Email Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage newsletters, campaigns, subscribers, and email logs
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto scrollbar-none max-w-full justify-start">
          <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
          <TabsTrigger value="campaigns" className="shrink-0">Campaigns</TabsTrigger>
          <TabsTrigger value="subscribers" className="shrink-0">Subscribers</TabsTrigger>
          <TabsTrigger value="logs" className="shrink-0">Email Logs</TabsTrigger>
          <TabsTrigger value="settings" className="shrink-0">Test & Settings</TabsTrigger>
          <TabsTrigger value="broadcast" className="shrink-0">Broadcast</TabsTrigger>
          <TabsTrigger value="automations" className="shrink-0">Automations</TabsTrigger>
          <TabsTrigger value="templates" className="shrink-0">Templates</TabsTrigger>
          <TabsTrigger value="previews" className="shrink-0">Previews</TabsTrigger>
        </TabsList>

        {/* ---- OVERVIEW TAB ---- */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all" onClick={() => setActiveTab("logs")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Send className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.total_sent ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Emails Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-red-400 hover:shadow-md transition-all" onClick={() => setActiveTab("logs")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.total_failed ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-green-400 hover:shadow-md transition-all" onClick={() => setActiveTab("subscribers")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.subscribers_confirmed ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Subscribers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-purple-400 hover:shadow-md transition-all" onClick={() => setActiveTab("campaigns")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.campaigns_sent ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Campaigns Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("campaigns")}>
              <CardContent className="pt-6 flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Create New Campaign</span>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("subscribers")}>
              <CardContent className="pt-6 flex items-center gap-3">
                <Users className="h-5 w-5" />
                <span className="font-medium">Manage Subscribers</span>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("settings")}>
              <CardContent className="pt-6 flex items-center gap-3">
                <Send className="h-5 w-5" />
                <span className="font-medium">Send Test Email</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---- CAMPAIGNS TAB ---- */}
        <TabsContent value="campaigns" className="space-y-6">
          {/* Create Campaign Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Campaign</CardTitle>
              <CardDescription>Draft a new newsletter or marketing campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} placeholder="e.g., June 2026 Newsletter" />
                </div>
                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input value={campaignSubject} onChange={(e) => setCampaignSubject(e.target.value)} placeholder="e.g., Top Jobs This Week" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>HTML Body</Label>
                <textarea
                  value={campaignBody}
                  onChange={(e) => setCampaignBody(e.target.value)}
                  placeholder="<p>Your email content here...</p>"
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
              <Button onClick={handleCreateCampaign} disabled={!campaignTitle || !campaignSubject || !campaignBody}>
                <Plus className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
            </CardContent>
          </Card>

          {/* Campaign List */}
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No campaigns yet</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.subject} &middot; {new Date(c.created_at).toLocaleDateString()}
                          {c.sent_count > 0 && ` \u00b7 ${c.sent_count} sent`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(c.status)}
                        {(c.status === "draft" || c.status === "scheduled") && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSendCampaign(c.id)}
                            disabled={sending}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {sending ? "Sending..." : "Send"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SUBSCRIBERS TAB ---- */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscribers</CardTitle>
                  <CardDescription>
                    {stats?.subscribers_confirmed ?? 0} confirmed, {stats?.subscribers_pending ?? 0} pending
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSubscribers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscribers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No subscribers yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Email</th>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Source</th>
                        <th className="text-left py-2 px-2">Joined</th>
                        <th className="text-right py-2 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s) => (
                        <tr key={s.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 font-mono text-xs">{s.email}</td>
                          <td className="py-2 px-2">{s.name || "-"}</td>
                          <td className="py-2 px-2">{statusBadge(s.status)}</td>
                          <td className="py-2 px-2 text-muted-foreground">{s.source}</td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="py-2 px-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSubscriber(s.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- EMAIL LOGS TAB ---- */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Logs</CardTitle>
                  <CardDescription>Recent email send history</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No email logs yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Recipient</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Subject</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 font-mono text-xs">{l.recipient_email}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-xs">{l.email_type}</Badge>
                          </td>
                          <td className="py-2 px-2 max-w-[200px] truncate">{l.subject}</td>
                          <td className="py-2 px-2">{statusBadge(l.status)}</td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">
                            {l.sent_at ? new Date(l.sent_at).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SETTINGS / TEST TAB ---- */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>Send a test email to verify the email system is working</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
              </div>
              <Button onClick={handleSendTest} disabled={testingEmail || !testEmail}>
                {testingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Email system settings and info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge>Resend</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">From Email</span>
                <code className="text-sm">{process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL : "onboarding@resend.dev"}</code>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Free Tier Limit</span>
                <Badge variant="outline">100 emails/day</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Newsletter Page</span>
                <Link href="/newsletter" className="text-sm text-primary hover:underline">
                  /newsletter
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- BROADCAST TAB ---- */}
        <TabsContent value="broadcast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Email</CardTitle>
              <CardDescription>Send an email to filtered user segments (all registered users, not just newsletter subscribers)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <select
                    value={broadcastRole}
                    onChange={(e) => setBroadcastRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All Users</option>
                    <option value="candidate">Candidates Only</option>
                    <option value="employer">Employers Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Location (optional)</Label>
                  <Input
                    value={broadcastLocation}
                    onChange={(e) => setBroadcastLocation(e.target.value)}
                    placeholder="e.g. Nairobi, Mombasa"
                  />
                </div>
              </div>

              <Button variant="outline" onClick={countRecipients} disabled={countingRecipients}>
                {countingRecipients ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Counting...</>
                ) : (
                  <><Users className="h-4 w-4 mr-2" /> Count Recipients</>
                )}
              </Button>

              {recipientCount !== null && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? 's' : ''} match the current filters
                </div>
              )}

              {/* Compose */}
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label>Subject B (optional A/B test)</Label>
                <Input
                  value={broadcastSubjectB}
                  onChange={(e) => setBroadcastSubjectB(e.target.value)}
                  placeholder="Alternative subject for A/B testing (leave empty to skip)"
                />
              </div>

              <div className="space-y-2">
                <Label>HTML Body</Label>
                <textarea
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
                  placeholder="<p>Your email HTML content here...</p>"
                />
              </div>

              <Button onClick={handleBroadcast} disabled={broadcasting || !broadcastSubject || !broadcastBody}>
                {broadcasting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send Broadcast</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- AUTOMATIONS TAB ---- */}
        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Automations</CardTitle>
                  <CardDescription>Automated emails triggered by user activity (runs daily at 8am)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAutomations}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAutomations ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : automationRules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No automation rules found</p>
                  <p className="text-xs text-muted-foreground mt-2">Run the migration first to seed default rules</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {automationRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">
                            {rule.type.replace(/_/g, ' ')}
                          </span>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Config: {JSON.stringify(rule.config)}
                        </p>
                        {rule.last_run_at && (
                          <p className="text-xs text-muted-foreground">
                            Last run: {new Date(rule.last_run_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => toggleAutomation(rule.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- MANAGED TEMPLATES TAB ---- */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutTemplate className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Edit stored templates used by automations and the homepage subscription popup
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loadingTemplates}>
                  {loadingTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Reload</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTemplates && emailTemplates.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading templates…
                </div>
              ) : emailTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">
                  No templates found. Reload to seed the popup welcome template.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    {emailTemplates.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => selectTemplate(t)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedTemplateSlug === t.slug
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {t.description || t.slug}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{t.slug}</Badge>
                          {t.is_active ? (
                            <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedTemplateSlug && (
                    <div className="lg:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tpl-name">Name</Label>
                        <Input
                          id="tpl-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tpl-desc">Description</Label>
                        <Input
                          id="tpl-desc"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="When this email is sent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tpl-subject">Subject</Label>
                        <Input
                          id="tpl-subject"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tpl-html">HTML body</Label>
                        <Textarea
                          id="tpl-html"
                          value={editHtml}
                          onChange={(e) => setEditHtml(e.target.value)}
                          className="min-h-[320px] font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Placeholders:{" "}
                          {(emailTemplates.find((t) => t.slug === selectedTemplateSlug)?.placeholders ?? [])
                            .map((p) => `{{${p}}}`)
                            .join(", ") || "{{name}}, {{site_url}}, {{toolkit_url}}, {{unsubscribe_url}}, {{year}}"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                          {savingTemplate ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save template
                        </Button>
                        {selectedTemplateSlug === "popup_newsletter_welcome" && (
                          <Button variant="outline" asChild>
                            <Link
                              href="/api/emails/preview?template=popup-newsletter-welcome"
                              target="_blank"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TEMPLATE PREVIEWS TAB ---- */}
        <TabsContent value="previews">
          <Card>
            <CardHeader>
              <CardTitle>Email Template Previews</CardTitle>
              <CardDescription>Click any template to see how it renders in an email client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { slug: 'popup-newsletter-welcome', name: 'Popup Newsletter Welcome', desc: 'Homepage subscription popup welcome + toolkit', badge: 'Marketing', color: 'bg-amber-100 text-amber-800' },
                  { slug: 'welcome', name: 'Welcome Email', desc: 'Sent to new users on signup', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'application-confirmation', name: 'Application Confirmation', desc: 'Sent to candidate after applying', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'application-status', name: 'Application Status', desc: 'Employer updates candidate status', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'employer-new-application', name: 'Employer Notification', desc: 'Employer notified of new application', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'new-message', name: 'New Message', desc: 'In-app message notification', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'password-reset', name: 'Password Reset', desc: 'Auth password reset link', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                  { slug: 'subscription-confirmation', name: 'Subscription Confirm', desc: 'Newsletter double opt-in', badge: 'Confirmation', color: 'bg-green-100 text-green-800' },
                  { slug: 'job-alert-digest', name: 'Job Alert Digest', desc: 'Matching jobs sent to user', badge: 'Marketing', color: 'bg-amber-100 text-amber-800' },
                  { slug: 'weekly-digest', name: 'Weekly Digest', desc: 'Featured jobs + career tips', badge: 'Marketing', color: 'bg-amber-100 text-amber-800' },
                  { slug: 'test', name: 'Test Email', desc: 'Admin test email', badge: 'Transactional', color: 'bg-blue-100 text-blue-800' },
                ].map((t) => (
                  <Link
                    key={t.slug}
                    href={`/api/emails/preview?template=${t.slug}`}
                    target="_blank"
                    className="block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded mt-2 ${t.color}`}>{t.badge}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
