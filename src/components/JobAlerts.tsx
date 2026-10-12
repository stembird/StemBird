import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SavedSearch {
  id: string;
  search_name: string;
  keywords: string | null;
  location: string | null;
  employment_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  job_function: string | null;
  industry: string | null;
  alert_enabled: boolean;
  alert_frequency: string;
  last_alert_sent_at: string | null;
  created_at: string;
}

export function JobAlerts() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    search_name: '',
    keywords: '',
    location: '',
    employment_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    job_function: '',
    industry: '',
    alert_enabled: true,
    alert_frequency: 'daily'
  });

  useEffect(() => {
    loadSavedSearches();
  }, []);

  async function loadSavedSearches() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          console.warn('saved_searches table does not exist yet. Please run migration.');
          toast({
            title: 'Feature not available',
            description: 'Job alerts feature is being set up. Please check back later.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        throw error;
      }

      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved searches.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      if (!formData.search_name.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a name for this search.',
          variant: 'destructive',
        });
        return;
      }

      const searchData = {
        user_id: user.id,
        search_name: formData.search_name,
        keywords: formData.keywords || null,
        location: formData.location || null,
        employment_type: formData.employment_type && formData.employment_type !== 'any' ? formData.employment_type : null,
        experience_level: formData.experience_level || null,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        job_function: formData.job_function || null,
        industry: formData.industry || null,
        alert_enabled: formData.alert_enabled,
        alert_frequency: formData.alert_frequency
      };

      if (editingId) {
        const { error } = await supabase
          .from('saved_searches')
          .update(searchData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Job alert updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('saved_searches')
          .insert([searchData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Job alert created successfully.',
        });
      }

      setShowDialog(false);
      setEditingId(null);
      resetForm();
      loadSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: 'Error',
        description: 'Failed to save job alert.',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Job alert deleted successfully.',
      });

      loadSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete job alert.',
        variant: 'destructive',
      });
    }
  }

  async function toggleAlert(id: string, enabled: boolean) {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ alert_enabled: enabled })
        .eq('id', id);

      if (error) throw error;

      setSavedSearches(prev =>
        prev.map(search =>
          search.id === id ? { ...search, alert_enabled: enabled } : search
        )
      );

      toast({
        title: enabled ? 'Alert enabled' : 'Alert disabled',
        description: enabled
          ? 'You will receive notifications for this search.'
          : 'Notifications paused for this search.',
      });
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  }

  function handleEdit(search: SavedSearch) {
    setFormData({
      search_name: search.search_name,
      keywords: search.keywords || '',
      location: search.location || '',
      employment_type: search.employment_type || '',
      experience_level: search.experience_level || '',
      salary_min: search.salary_min?.toString() || '',
      salary_max: search.salary_max?.toString() || '',
      job_function: search.job_function || '',
      industry: search.industry || '',
      alert_enabled: search.alert_enabled,
      alert_frequency: search.alert_frequency
    });
    setEditingId(search.id);
    setShowDialog(true);
  }

  function resetForm() {
    setFormData({
      search_name: '',
      keywords: '',
      location: '',
      employment_type: '',
      experience_level: '',
      salary_min: '',
      salary_max: '',
      job_function: '',
      industry: '',
      alert_enabled: true,
      alert_frequency: 'daily'
    });
  }

  function handleNewAlert() {
    resetForm();
    setEditingId(null);
    setShowDialog(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Job Alerts
            </CardTitle>
            <CardDescription>
              Get notified when new jobs match your criteria
            </CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={handleNewAlert}>
                <Plus className="h-4 w-4 mr-2" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Job Alert' : 'Create Job Alert'}
                </DialogTitle>
                <DialogDescription>
                  Set up criteria and get notified when matching jobs are posted
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="search_name">Alert Name *</Label>
                  <Input
                    id="search_name"
                    placeholder="e.g., Senior Developer Jobs in Lagos"
                    value={formData.search_name}
                    onChange={(e) => setFormData({ ...formData, search_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., React, TypeScript, Node.js"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Lagos, Remote"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_type">Employment Type</Label>
                    <Select
                      value={formData.employment_type}
                      onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_min">Min Salary</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      placeholder="e.g., 100000"
                      value={formData.salary_min}
                      onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary_max">Max Salary</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      placeholder="e.g., 500000"
                      value={formData.salary_max}
                      onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert_frequency">Alert Frequency</Label>
                  <Select
                    value={formData.alert_frequency}
                    onValueChange={(value) => setFormData({ ...formData, alert_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="alert_enabled"
                    checked={formData.alert_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, alert_enabled: checked })}
                  />
                  <Label htmlFor="alert_enabled">Enable notifications</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No job alerts yet</p>
            <p className="text-sm">Create an alert to get notified about new jobs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{search.search_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {search.keywords && (
                        <Badge variant="secondary">Keywords: {search.keywords}</Badge>
                      )}
                      {search.location && (
                        <Badge variant="secondary">Location: {search.location}</Badge>
                      )}
                      {search.employment_type && (
                        <Badge variant="secondary">{search.employment_type}</Badge>
                      )}
                      {search.salary_min && (
                        <Badge variant="secondary">
                          Min: NGN {search.salary_min.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={search.alert_enabled}
                      onCheckedChange={(checked) => toggleAlert(search.id, checked)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    <span>Frequency: {search.alert_frequency}</span>
                    {search.last_alert_sent_at && (
                      <span className="ml-4">
                        Last sent: {new Date(search.last_alert_sent_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(search)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(search.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
