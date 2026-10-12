"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { CmsPagePicker } from "@/components/admin/CmsPagePicker";
import {
  emptyPageSeoForm,
  PageSeoPanel,
  type PageSeoForm,
} from "@/components/admin/PageSeoPanel";
import {
  CMS_PAGES,
  getMissingDefaultSections,
  getPageSeoRow,
  toPageContentInserts,
} from "@/lib/cmsPages";

interface PageContent {
  id: string;
  page_slug: string;
  section_key: string;
  content_type: string;
  content_value: string;
  metadata: Record<string, any>;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_url_slug?: string | null;
  seo_canonical_url?: string | null;
  seo_index?: boolean | null;
  seo_h1_title?: string | null;
  seo_follow?: boolean | null;
}

const CONTENT_TYPES = [
  { value: "text", label: "Text" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "number", label: "Number" },
];

function ContentEditorInner() {
  const searchParams = useSearchParams();
  const pageFromUrl = searchParams.get("page");
  const focusSeo = searchParams.get("focus") === "seo";
  const initialPage =
    CMS_PAGES.some((page) => page.slug === pageFromUrl) && pageFromUrl
      ? pageFromUrl
      : "home";

  const [selectedPage, setSelectedPage] = useState(initialPage);
  const [editingItem, setEditingItem] = useState<PageContent | null>(null);
  const [seoForm, setSeoForm] = useState<PageSeoForm>(emptyPageSeoForm());
  const [newItem, setNewItem] = useState({
    section_key: "",
    content_type: "text",
    content_value: "",
    metadata: "{}",
  });

  const queryClient = useQueryClient();
  const seededPages = useRef(new Set<string>());
  const scrolledToSeo = useRef(false);
  const currentPage = CMS_PAGES.find((page) => page.slug === selectedPage);

  const { data: pageContent = [], isLoading } = useQuery({
    queryKey: ["page-content-admin", selectedPage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_slug", selectedPage)
        .order("section_key");

      if (error) throw error;
      return data as PageContent[];
    },
  });

  const missingDefaults = getMissingDefaultSections(
    selectedPage,
    pageContent.map((item) => item.section_key)
  );
  const seoRow = useMemo(() => getPageSeoRow(pageContent), [pageContent]);

  const updateMutation = useMutation({
    mutationFn: async (item: PageContent) => {
      const { error } = await supabase
        .from("page_content")
        .update({
          content_value: item.content_value,
          content_type: item.content_type,
          metadata: item.metadata,
        })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content-admin", selectedPage] });
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      toast.success("Content updated successfully!");
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let metadata = {};
      try {
        metadata = JSON.parse(newItem.metadata);
      } catch {
        throw new Error("Invalid JSON in metadata");
      }

      const { error } = await supabase.from("page_content").insert({
        page_slug: selectedPage,
        section_key: newItem.section_key,
        content_type: newItem.content_type,
        content_value: newItem.content_value,
        metadata,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content-admin", selectedPage] });
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      toast.success("Content created successfully!");
      setNewItem({
        section_key: "",
        content_type: "text",
        content_value: "",
        metadata: "{}",
      });
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const seedMissingMutation = useMutation({
    mutationFn: async () => {
      const missing = getMissingDefaultSections(
        selectedPage,
        pageContent.map((item) => item.section_key)
      );
      if (missing.length === 0) return;

      const { error } = await supabase
        .from("page_content")
        .insert(toPageContentInserts(selectedPage, missing));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content-admin", selectedPage] });
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      toast.success("Website sections added");
    },
    onError: (error) => {
      toast.error(`Failed to add sections: ${error.message}`);
    },
  });

  useEffect(() => {
    if (isLoading || seedMissingMutation.isPending) return;
    if (missingDefaults.length === 0) return;
    if (seededPages.current.has(selectedPage)) return;
    seededPages.current.add(selectedPage);
    seedMissingMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage, isLoading, missingDefaults.length]);

  useEffect(() => {
    if (!currentPage) return;
    setSeoForm({
      seo_title: seoRow?.seo_title || currentPage.label,
      seo_meta_description: seoRow?.seo_meta_description || "",
      seo_url_slug: seoRow?.seo_url_slug || currentPage.defaultUrl || "",
      seo_canonical_url: seoRow?.seo_canonical_url || currentPage.defaultCanonical || "",
      seo_h1_title: seoRow?.seo_h1_title || "",
      seo_index: seoRow?.seo_index ?? true,
      seo_follow: seoRow?.seo_follow ?? true,
    });
  }, [currentPage, seoRow]);

  useEffect(() => {
    if (!focusSeo || scrolledToSeo.current || !currentPage?.hasSeo) return;
    if (isLoading) return;
    const node = document.getElementById("page-seo");
    if (!node) return;
    scrolledToSeo.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusSeo, isLoading, currentPage, pageContent.length]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("page_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content-admin", selectedPage] });
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      toast.success("Content deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const seoMutation = useMutation({
    mutationFn: async () => {
      if (!seoRow?.id) {
        throw new Error("Load website copy for this page before saving SEO");
      }
      const { error } = await supabase
        .from("page_content")
        .update({
          seo_title: seoForm.seo_title,
          seo_meta_description: seoForm.seo_meta_description,
          seo_url_slug: seoForm.seo_url_slug,
          seo_canonical_url: seoForm.seo_canonical_url,
          seo_index: seoForm.seo_index,
          seo_h1_title: seoForm.seo_h1_title,
          seo_follow: seoForm.seo_follow,
        })
        .eq("id", seoRow.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content-admin", selectedPage] });
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      toast.success("Search listing saved");
    },
    onError: (error) => {
      toast.error(`Failed to save SEO: ${error.message}`);
    },
  });

  const handleSave = (item: PageContent) => {
    updateMutation.mutate(item);
  };

  const handleCreate = () => {
    if (!newItem.section_key || !newItem.content_value) {
      toast.error("Section key and content value are required");
      return;
    }
    createMutation.mutate();
  };

  const handleDelete = (item: PageContent) => {
    if (currentPage?.hasSeo && item.section_key === "hero_title") {
      toast.error("hero_title also stores this page’s search listing. Edit it instead of deleting.");
      return;
    }
    if (confirm("Are you sure you want to delete this content?")) {
      deleteMutation.mutate(item.id);
    }
  };

  const handlePageChange = (slug: string) => {
    setEditingItem(null);
    setSelectedPage(slug);
  };

  return (
    <div className="container mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words">
          Content & SEO
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Edit page copy and the Google search listing for the same page, without touching code.
        </p>
      </div>

      <Tabs value={selectedPage} onValueChange={handlePageChange} className="space-y-6 min-w-0">
        <CmsPagePicker
          pages={CMS_PAGES}
          value={selectedPage}
          onChange={handlePageChange}
        />

        {CMS_PAGES.map((page) => (
          <TabsContent key={page.slug} value={page.slug} className="space-y-6 min-w-0">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="space-y-3 sm:space-y-0">
                <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-words">Page copy</span>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {missingDefaults.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => seedMissingMutation.mutate()}
                        disabled={seedMissingMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2 shrink-0" />
                        Add {missingDefaults.length} website section
                        {missingDefaults.length === 1 ? "" : "s"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["page-content-admin"] })}
                    >
                      <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
                      Refresh
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {isLoading || (missingDefaults.length > 0 && seedMissingMutation.isPending) ? (
                  <p className="text-muted-foreground">Loading website copy...</p>
                ) : pageContent.length === 0 ? (
                  <p className="text-muted-foreground">
                    No content found for this page
                    {missingDefaults.length > 0
                      ? ". Click “Add website sections” to load the current copy."
                      : "."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {pageContent.map((item) => (
                      <Card key={item.id} className="border-2 min-w-0 overflow-hidden">
                        <CardContent className="pt-6 px-4 sm:px-6 min-w-0">
                          {editingItem?.id === item.id ? (
                            <div className="space-y-4 min-w-0">
                              <div className="min-w-0">
                                <Label>Section Key</Label>
                                <Input
                                  value={editingItem.section_key}
                                  disabled
                                  className="bg-muted"
                                />
                              </div>
                              <div>
                                <Label>Content Type</Label>
                                <Select
                                  value={editingItem.content_type}
                                  onValueChange={(value) =>
                                    setEditingItem({ ...editingItem, content_type: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONTENT_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <Label>Content Value</Label>
                                <Textarea
                                  value={editingItem.content_value}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      content_value: e.target.value,
                                    })
                                  }
                                  rows={6}
                                  className="font-mono text-sm break-words"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label>Metadata (JSON)</Label>
                                <Textarea
                                  value={JSON.stringify(editingItem.metadata, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setEditingItem({ ...editingItem, metadata: parsed });
                                    } catch {
                                      // Invalid JSON, don't update
                                    }
                                  }}
                                  rows={3}
                                  className="font-mono text-sm break-words"
                                />
                              </div>

                              <div className="flex flex-col-reverse sm:flex-row gap-2">
                                <Button
                                  onClick={() => handleSave(editingItem)}
                                  disabled={updateMutation.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  <Save className="h-4 w-4 mr-2 shrink-0" />
                                  Save Changes
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                  className="w-full sm:w-auto"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 min-w-0">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="font-semibold text-base sm:text-lg break-all">
                                      {item.section_key}
                                    </span>
                                    <span className="text-xs bg-muted px-2 py-1 rounded shrink-0">
                                      {item.content_type}
                                    </span>
                                  </div>
                                  <div className="bg-muted p-3 rounded text-sm font-mono whitespace-pre-wrap break-words">
                                    {item.content_value.length > 200
                                      ? item.content_value.substring(0, 200) + "..."
                                      : item.content_value}
                                  </div>
                                  {Object.keys(item.metadata || {}).length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground break-all">
                                      Metadata: {JSON.stringify(item.metadata)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto sm:ml-4 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => setEditingItem(item)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => handleDelete(item)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sm:hidden ml-2">Delete</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {page.hasSeo && (
              <PageSeoPanel
                page={page}
                form={seoForm}
                onChange={setSeoForm}
                onSave={() => seoMutation.mutate()}
                saving={seoMutation.isPending}
                disabled={!seoRow}
              />
            )}

            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center min-w-0">
                  <Plus className="h-5 w-5 mr-2 shrink-0" />
                  <span className="break-words">Add New Content Section</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 min-w-0">
                  <div>
                    <Label>Section Key *</Label>
                    <Input
                      placeholder="e.g., hero_title, nav_browse_label"
                      value={newItem.section_key}
                      onChange={(e) =>
                        setNewItem({ ...newItem, section_key: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use snake_case for consistency
                    </p>
                  </div>
                  <div>
                    <Label>Content Type</Label>
                    <Select
                      value={newItem.content_type}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, content_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Content Value *</Label>
                    <Textarea
                      placeholder="Enter your content here..."
                      value={newItem.content_value}
                      onChange={(e) =>
                        setNewItem({ ...newItem, content_value: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Metadata (JSON)</Label>
                    <Textarea
                      placeholder='{"key": "value"}'
                      value={newItem.metadata}
                      onChange={(e) => setNewItem({ ...newItem, metadata: e.target.value })}
                      rows={2}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2 shrink-0" />
                    Create Content Section
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function ContentEditorPage() {
  return (
    <RequireAdmin>
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-8 text-muted-foreground">
            Loading editor...
          </div>
        }
      >
        <ContentEditorInner />
      </Suspense>
    </RequireAdmin>
  );
}
