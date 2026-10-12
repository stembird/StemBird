'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  duplicateJob,
  renewJob,
  setAutoRenew,
  setJobExpiration,
  getExpiringJobs,
  getPromotedJobs,
  getFeaturedJobs
} from '@/lib/jobManagement';
import { JobTemplatesManager } from './JobTemplatesManager';
import { BulkJobActions } from './BulkJobActions';
import { MpesaCheckoutDialog } from './payments/MpesaCheckoutDialog';
import { getPaidJobActionPricing } from '@/lib/mpesa/pricing';
import {
  Copy,
  Star,
  TrendingUp,
  RefreshCw,
  Calendar,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function JobManagementDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [checkout, setCheckout] = useState<{
    jobId: string;
    jobTitle: string;
    action: 'promote' | 'feature';
    tier?: string;
    amount: number;
    label: string;
    description: string;
    sku?: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, [activeTab]);

  async function loadJobs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('jobs')
        .select('*, companies(*)')
        .eq('user_id', user.id);

      if (activeTab === 'promoted') {
        query = query.eq('is_promoted', true);
      } else if (activeTab === 'featured') {
        query = query.eq('is_featured', true);
      } else if (activeTab === 'expiring') {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        query = query
          .not('expires_at', 'is', null)
          .lte('expires_at', futureDate.toISOString())
          .gte('expires_at', new Date().toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  }

  function toggleSelectAll() {
    if (selectedJobIds.length === jobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(jobs.map(job => job.id));
    }
  }

  async function handleDuplicate(jobId: string) {
    try {
      const newJobId = await duplicateJob(jobId);
      toast({ title: 'Job duplicated successfully' });
      loadJobs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  function openPromoteCheckout(job: any) {
    const pricing = getPaidJobActionPricing('promote', 'basic');
    if (!pricing) {
      toast({
        title: 'Promote unavailable',
        description: 'No pricing is configured for promoting jobs.',
        variant: 'destructive'
      });
      return;
    }
    setCheckout({
      jobId: job.id,
      jobTitle: job.title,
      action: 'promote',
      tier: pricing.tier,
      amount: pricing.amount,
      label: pricing.label,
      description: pricing.description,
      sku: pricing.sku,
    });
  }

  function openFeatureCheckout(job: any) {
    const pricing = getPaidJobActionPricing('feature');
    if (!pricing) {
      toast({
        title: 'Feature unavailable',
        description: 'No pricing is configured for featuring jobs.',
        variant: 'destructive'
      });
      return;
    }
    setCheckout({
      jobId: job.id,
      jobTitle: job.title,
      action: 'feature',
      amount: pricing.amount,
      label: pricing.label,
      description: pricing.description,
      sku: pricing.sku,
    });
  }

  async function handleRenew(jobId: string) {
    try {
      await renewJob(jobId);
      toast({ title: 'Job renewed successfully' });
      loadJobs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleToggleAutoRenew(jobId: string, currentValue: boolean) {
    try {
      await setAutoRenew(jobId, !currentValue, 30);
      toast({
        title: !currentValue ? 'Auto-renew enabled' : 'Auto-renew disabled'
      });
      loadJobs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  function renderJobCard(job: any) {
    const isSelected = selectedJobIds.includes(job.id);
    const isExpiring = job.expires_at && new Date(job.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return (
      <Card key={job.id} className={isSelected ? 'border-primary' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleJobSelection(job.id)}
              />
              <div className="flex-1">
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <CardDescription>
                  {job.location} • {job.job_type}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-1">
              {job.is_featured && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </Badge>
              )}
              {job.is_promoted && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Promoted
                </Badge>
              )}
              {job.auto_renew && (
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Auto-renew
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </span>
              {job.expires_at && (
                <span className={`flex items-center gap-1 ${isExpiring ? 'text-orange-600' : ''}`}>
                  <Clock className="h-4 w-4" />
                  Expires {formatDistanceToNow(new Date(job.expires_at), { addSuffix: true })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleDuplicate(job.id)}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              {!job.is_promoted && (
                <Button size="sm" variant="outline" onClick={() => openPromoteCheckout(job)}>
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Promote
                </Button>
              )}
              {!job.is_featured && (
                <Button size="sm" variant="outline" onClick={() => openFeatureCheckout(job)}>
                  <Star className="h-4 w-4 mr-1" />
                  Feature
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleRenew(job.id)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Renew
              </Button>
              <Button
                size="sm"
                variant={job.auto_renew ? 'default' : 'outline'}
                onClick={() => handleToggleAutoRenew(job.id, job.auto_renew)}
              >
                Auto-renew {job.auto_renew ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Job Management</h2>
          <p className="text-muted-foreground">Manage your job postings efficiently</p>
        </div>
        {selectedJobIds.length > 0 && (
          <Button onClick={() => setBulkActionsOpen(true)}>
            Bulk Actions ({selectedJobIds.length})
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="promoted">Promoted</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {jobs.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedJobIds.length === jobs.length ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedJobIds.length} of {jobs.length} selected
              </span>
            </div>
          )}
          {loading ? (
            <div className="text-center py-8">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No jobs found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="promoted" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading promoted jobs...</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No promoted jobs</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading featured jobs...</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No featured jobs</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading expiring jobs...</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No jobs expiring soon</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <JobTemplatesManager />
        </TabsContent>
      </Tabs>

      <BulkJobActions
        selectedJobIds={selectedJobIds}
        onComplete={() => {
          setSelectedJobIds([]);
          loadJobs();
        }}
        open={bulkActionsOpen}
        onOpenChange={setBulkActionsOpen}
      />

      {checkout && (
        <MpesaCheckoutDialog
          open={!!checkout}
          onOpenChange={(open) => {
            if (!open) setCheckout(null);
          }}
          title={`${checkout.label}${checkout.jobTitle ? ` — ${checkout.jobTitle}` : ''}`}
          description={checkout.description}
          amount={checkout.amount}
          jobId={checkout.jobId}
          action={checkout.action}
          tier={checkout.tier}
          sku={checkout.sku}
          onSuccess={() => {
            setCheckout(null);
            loadJobs();
          }}
        />
      )}
    </div>
  );
}
