import { redirect } from "next/navigation";

/** SEO Manager now lives in the Content Editor as a page-level search listing. */
export default async function SeoEditorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const query = new URLSearchParams({ focus: "seo" });
  if (page) query.set("page", page);
  redirect(`/dashboard/content-editor?${query.toString()}`);
}
