/**
 * Bust ISR for public catalog surfaces after a job is published.
 * No-ops outside Next.js (GitHub Actions worker, local scripts).
 */
export async function revalidatePublicJobSurfaces(job?: {
  id?: string | null
  job_slug?: string | null
}): Promise<void> {
  try {
    const { revalidatePath } = await import("next/cache")
    revalidatePath("/")
    revalidatePath("/jobs")
    revalidatePath("/scholarships")
    revalidatePath("/companies")
    revalidatePath("/jobs/counties")
    revalidatePath("/jobs/functions")
    revalidatePath("/jobs/industries")
    if (job?.job_slug) {
      revalidatePath(`/jobs/${job.job_slug}`)
      revalidatePath(`/scholarships/${job.job_slug}`)
    }
    if (job?.id) {
      revalidatePath(`/jobs/${job.id}`)
      revalidatePath(`/scholarships/${job.id}`)
    }
  } catch {
    // Worker / Actions has no Next cache.
  }
}
