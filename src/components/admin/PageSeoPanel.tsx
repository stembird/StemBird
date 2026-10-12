"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CmsPage } from "@/lib/cmsPages";
import { CheckCircle2, FileText, Globe, Save, XCircle } from "lucide-react";

export type PageSeoForm = {
  seo_title: string;
  seo_meta_description: string;
  seo_url_slug: string;
  seo_canonical_url: string;
  seo_h1_title: string;
  seo_index: boolean;
  seo_follow: boolean;
};

type PageSeoPanelProps = {
  page: CmsPage;
  form: PageSeoForm;
  onChange: (form: PageSeoForm) => void;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
};

export function emptyPageSeoForm(page?: CmsPage): PageSeoForm {
  return {
    seo_title: page?.label || "",
    seo_meta_description: "",
    seo_url_slug: page?.defaultUrl || "",
    seo_canonical_url: page?.defaultCanonical || "",
    seo_h1_title: "",
    seo_index: true,
    seo_follow: true,
  };
}

export function PageSeoPanel({
  page,
  form,
  onChange,
  onSave,
  saving,
  disabled,
}: PageSeoPanelProps) {
  const titleLength = form.seo_title.length;
  const descLength = form.seo_meta_description.length;

  return (
    <div id="page-seo" className="space-y-6 min-w-0 scroll-mt-24">
      <Card className="border-2 border-primary/20 min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 shrink-0" />
            Google Search Preview
          </CardTitle>
          <CardDescription>
            How {page.label} will appear in search results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-gray-900 p-4 rounded border min-w-0">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 break-all">
              {form.seo_canonical_url || page.defaultCanonical}
            </div>
            <div className="text-xl text-blue-600 dark:text-blue-400 mb-1 font-medium break-words">
              {form.seo_title || "Your SEO Title Here"}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
              {form.seo_meta_description || "Your meta description will appear here..."}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0" />
            Search listing
          </CardTitle>
          <CardDescription>
            Saved on this page once — not on every content section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="seo-title">SEO Title *</Label>
            <Input
              id="seo-title"
              value={form.seo_title}
              onChange={(e) => onChange({ ...form, seo_title: e.target.value })}
              placeholder="Controls the clickable headline in Google search results"
              className="mt-2"
              disabled={disabled}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
              <p className="text-xs text-muted-foreground">
                The title that appears in search engine results
              </p>
              <span
                className={`text-xs ${
                  titleLength > 60
                    ? "text-red-500"
                    : titleLength > 50
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
              >
                {titleLength} / 60 characters
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="meta-desc">Meta Description *</Label>
            <Textarea
              id="meta-desc"
              value={form.seo_meta_description}
              onChange={(e) =>
                onChange({ ...form, seo_meta_description: e.target.value })
              }
              placeholder="Short summary shown under the title in search results"
              rows={3}
              className="mt-2"
              disabled={disabled}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
              <p className="text-xs text-muted-foreground">
                Brief description that appears below the title in search results
              </p>
              <span
                className={`text-xs ${
                  descLength > 160
                    ? "text-red-500"
                    : descLength > 150
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
              >
                {descLength} / 160 characters
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="h1-title">H1 Title</Label>
            <Input
              id="h1-title"
              value={form.seo_h1_title}
              onChange={(e) => onChange({ ...form, seo_h1_title: e.target.value })}
              placeholder="Main heading for search engines"
              className="mt-2"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The single, clear main heading for the page
            </p>
          </div>

          <div>
            <Label htmlFor="url-slug">URL Slug</Label>
            <Input
              id="url-slug"
              value={form.seo_url_slug}
              onChange={(e) => onChange({ ...form, seo_url_slug: e.target.value })}
              placeholder="/page-url-slug"
              className="mt-2"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The clean, readable URL path for this page
            </p>
          </div>

          <div>
            <Label htmlFor="canonical">Canonical URL</Label>
            <Input
              id="canonical"
              value={form.seo_canonical_url}
              onChange={(e) =>
                onChange({ ...form, seo_canonical_url: e.target.value })
              }
              placeholder="https://www.careersasa.co.ke/page-url"
              className="mt-2"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tells search engines which version of the page is the main one
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="flex items-center justify-between space-x-2 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="index-toggle" className="text-base">
                  Index Page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow this page to appear in search results
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {form.seo_index ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Switch
                  id="index-toggle"
                  checked={form.seo_index}
                  onCheckedChange={(checked) =>
                    onChange({ ...form, seo_index: checked })
                  }
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="follow-toggle" className="text-base">
                  Follow Links
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow search engines to follow links on this page
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {form.seo_follow ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Switch
                  id="follow-toggle"
                  checked={form.seo_follow}
                  onCheckedChange={(checked) =>
                    onChange({ ...form, seo_follow: checked })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={onSave}
              disabled={saving || disabled}
              className="w-full"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2 shrink-0" />
              {saving ? "Saving..." : "Save search listing"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
