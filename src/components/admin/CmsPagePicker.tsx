"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CmsPage } from "@/lib/cmsPages";

type CmsPagePickerProps = {
  pages: Pick<CmsPage, "slug" | "label">[];
  value: string;
  onChange: (slug: string) => void;
};

/**
 * Mobile: full-width select so labels are never clipped.
 * Desktop: wrapping tabs that grow with the page list.
 */
export function CmsPagePicker({ pages, value, onChange }: CmsPagePickerProps) {
  return (
    <>
      <div className="space-y-2 lg:hidden">
        <Label htmlFor="cms-page-select">Page</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="cms-page-select" className="w-full">
            <SelectValue placeholder="Select a page" />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page) => (
              <SelectItem key={page.slug} value={page.slug}>
                {page.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TabsList className="hidden h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 lg:flex">
        {pages.map((page) => (
          <TabsTrigger
            key={page.slug}
            value={page.slug}
            className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-sm"
          >
            {page.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </>
  );
}
