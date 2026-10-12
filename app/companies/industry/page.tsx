import { redirect } from "next/navigation";

/**
 * `/companies/industry` matches `app/companies/[id]` unless this page exists.
 * Crawlers that strip the industry slug were 5xx'ing on the uuid lookup.
 */
export default function CompaniesIndustryIndexPage() {
  redirect("/companies/industry/all");
}
