/**
 * Attach featured + in-body images to existing CareerSasa blog posts.
 * Run: npx tsx scripts/update-blog-images.mts
 *
 * Images live in /public/assets/blog/ and are referenced by site-relative paths.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

function figure(src: string, alt: string) {
  return `<p><img src="${src}" alt="${alt}" /></p>`;
}

function insertAfterHeading(html: string, headingSnippet: string, imageHtml: string) {
  const idx = html.indexOf(headingSnippet);
  if (idx === -1) {
    throw new Error(`Heading not found: ${headingSnippet}`);
  }
  // Insert after the closing </h2> that follows this heading
  const close = html.indexOf("</h2>", idx);
  if (close === -1) {
    throw new Error(`</h2> not found after: ${headingSnippet}`);
  }
  const insertAt = close + "</h2>".length;
  // Skip a following empty <p><br></p> if present so image sits cleanly
  let rest = html.slice(insertAt);
  rest = rest.replace(/^(<p><br\s*\/?><\/p>)+/, "");
  return html.slice(0, insertAt) + imageHtml + rest;
}

const SECRETS_SLUG = "7-job-seeking-kenyan-secrets-you-didnt-know-but-recruiters-do";
const INTERVIEW_SLUG =
  "how-to-ace-any-job-interview-in-2025-your-careersasa-guide-to-showing-up-with-confidence";

async function updateSecrets() {
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, content, featured_image")
    .eq("slug", SECRETS_SLUG)
    .single();

  if (error || !post) throw error || new Error("Secrets post not found");

  let content = post.content || "";
  // Idempotent: strip previously injected blog asset images
  content = content.replace(/<p><img src="\/assets\/blog\/secrets-[^"]+"[^>]*\/?><\/p>/g, "");

  content = insertAfterHeading(
    content,
    "1. Your CV is judged in 6 seconds",
    figure(
      "/assets/blog/secrets-cv.jpg",
      "A clean resume and laptop on a desk — first impressions matter in six seconds"
    )
  );
  content = insertAfterHeading(
    content,
    "4. Your reputation online matters more than you think",
    figure(
      "/assets/blog/secrets-networking.jpg",
      "Young Black professionals collaborating — your online reputation travels with you"
    )
  );
  content = insertAfterHeading(
    content,
    "7. Most job seekers ignore the 3 biggest opportunity channels",
    figure(
      "/assets/blog/secrets-opportunity.jpg",
      "Professionals reviewing opportunities on a laptop beyond traditional job boards"
    )
  );

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({
      featured_image: "/assets/blog/secrets-featured.jpg",
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  if (updateError) throw updateError;
  console.log("Updated secrets post:", post.id);
}

async function updateInterview() {
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, content, featured_image")
    .eq("slug", INTERVIEW_SLUG)
    .single();

  if (error || !post) throw error || new Error("Interview post not found");

  let content = post.content || "";
  content = content.replace(/<p><img src="\/assets\/blog\/interview-[^"]+"[^>]*\/?><\/p>/g, "");

  content = insertAfterHeading(
    content,
    "2. Research the Organisation Thoroughly",
    figure(
      "/assets/blog/interview-research.jpg",
      "Researching a company with notes and a laptop before an interview"
    )
  );
  content = insertAfterHeading(
    content,
    "3. Use the CareerSasa STAR Method to Tell Strong Stories",
    figure(
      "/assets/blog/interview-storytelling.jpg",
      "A focused young professional preparing clear STAR interview stories"
    )
  );
  content = insertAfterHeading(
    content,
    "5. Present Yourself Professionally and Comfortably",
    figure(
      "/assets/blog/interview-confidence.jpg",
      "A confident young African professional ready for interview day"
    )
  );

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({
      featured_image: "/assets/blog/interview-featured.jpg",
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  if (updateError) throw updateError;
  console.log("Updated interview post:", post.id);
}

async function main() {
  await updateSecrets();
  await updateInterview();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, featured_image, content")
    .in("slug", [SECRETS_SLUG, INTERVIEW_SLUG]);

  if (error) throw error;

  for (const p of data || []) {
    const imgs = [...(p.content || "").matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    console.log("\n", p.slug);
    console.log("  featured:", p.featured_image);
    console.log("  in-body images:", imgs.length, imgs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
