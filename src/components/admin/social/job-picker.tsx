'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { authedFetch } from './api'
import { formatDateOnly } from './format'
import type { EligibleJob, JobFilters } from '@/lib/social/types'

interface Props {
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onGenerate: (ids: string[]) => void
}

const PAGE_SIZE = 20

export function JobPicker({ selectedIds, onSelectionChange, onGenerate }: Props) {
  const [search, setSearch] = useState('')
  const [jobFunction, setJobFunction] = useState('all')
  const [location, setLocation] = useState('')
  const [employer, setEmployer] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [functionOptions, setFunctionOptions] = useState<string[]>([])

  const [jobs, setJobs] = useState<EligibleJob[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ;(supabase as any)
      .from('job_functions')
      .select('name')
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data, error }: { data: { name: string }[] | null; error: { message?: string } | null }) => {
        if (!error) setFunctionOptions((data ?? []).map((d: { name: string }) => d.name))
      })
      .catch(() => {
        /* non-fatal */
      })
  }, [])

  const buildFilters = useCallback((): JobFilters => {
    return {
      search: search.trim() || undefined,
      job_function: jobFunction === 'all' ? undefined : jobFunction,
      location: location.trim() || undefined,
      employer: employer.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      featured_only: featuredOnly,
      page,
      page_size: PAGE_SIZE,
    }
  }, [search, jobFunction, location, employer, dateFrom, dateTo, featuredOnly, page])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const filters = buildFilters()
      if (filters.search) params.set('search', filters.search)
      if (filters.job_function) params.set('job_function', filters.job_function)
      if (filters.location) params.set('location', filters.location)
      if (filters.employer) params.set('employer', filters.employer)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)
      if (filters.featured_only) params.set('featured_only', '1')
      params.set('page', String(page))
      params.set('page_size', String(PAGE_SIZE))

      const result = await authedFetch<{ jobs: EligibleJob[]; total: number }>(
        `/api/admin/social/jobs?${params.toString()}`
      )
      setJobs(result.jobs ?? [])
      setTotal(result.total ?? 0)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [buildFilters, page])

  // Debounced refetch for text filters.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchJobs()
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, jobFunction, location, employer, dateFrom, dateTo, featuredOnly, fetchJobs])

  const toggleJob = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const toggleAllOnPage = () => {
    const pageIds = jobs.map((j) => j.id)
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      for (const id of pageIds) next.delete(id)
    } else {
      for (const id of pageIds) next.add(id)
    }
    onSelectionChange(next)
  }

  const clearSelection = () => onSelectionChange(new Set())

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title or employer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div>
            <Select value={jobFunction} onValueChange={setJobFunction}>
              <SelectTrigger>
                <SelectValue placeholder="Job function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All functions</SelectItem>
                {functionOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Location (e.g. Nairobi)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            placeholder="Employer (e.g. KCB)"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Posted from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Posted to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer">
            <Checkbox
              checked={featuredOnly}
              onCheckedChange={(v) => setFeaturedOnly(v === true)}
              id="featured-only"
            />
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Featured / high-quality jobs only
            </span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? (
              <>
                <Badge className="mr-1 bg-[#F97316] hover:bg-[#ea6c0c]">{selectedIds.size}</Badge>
                job(s) selected
                <button className="ml-2 text-xs underline text-muted-foreground hover:text-foreground" onClick={clearSelection}>
                  Clear
                </button>
              </>
            ) : (
              `Select jobs from ${total.toLocaleString()} eligible active job(s)`
            )}
          </p>
          <Button
            onClick={() => onGenerate(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="bg-[#F97316] text-white hover:bg-[#ea6c0c]"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Social Posts
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
          </div>
        ) : jobs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No active jobs match the filters. Adjust your filters to see more.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id))}
                        onCheckedChange={toggleAllOnPage}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className={selectedIds.has(job.id) ? 'bg-primary/5' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(job.id)}
                          onCheckedChange={() => toggleJob(job.id)}
                          aria-label={`Select ${job.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium max-w-[260px]">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{job.title}</span>
                          {job.is_featured && (
                            <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {job.hiring_organization_name || job.company}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">{job.location || '—'}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {(job.job_functions?.[0] ?? job.job_function) || '—'}
                      </TableCell>
                      <TableCell>{formatDateOnly(job.date_posted ?? job.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total.toLocaleString()} jobs
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
