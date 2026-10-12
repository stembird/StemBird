'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getJobTemplates, createJobTemplate, updateJobTemplate, deleteJobTemplate, createJobFromTemplate } from '@/lib/jobManagement';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Edit, Trash2, Copy } from 'lucide-react';

export function JobTemplatesManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    template_name: '',
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    job_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    location: '',
    remote_type: '',
    category: '',
    tags: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getJobTemplates(user.id);
      setTemplates(data);
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

  function resetForm() {
    setFormData({
      template_name: '',
      title: '',
      description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
      job_type: '',
      experience_level: '',
      salary_min: '',
      salary_max: '',
      location: '',
      remote_type: '',
      category: '',
      tags: ''
    });
    setEditingTemplate(null);
  }

  function handleEdit(template: any) {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      title: template.title,
      description: template.description || '',
      requirements: template.requirements || '',
      responsibilities: template.responsibilities || '',
      benefits: template.benefits || '',
      job_type: template.job_type || '',
      experience_level: template.experience_level || '',
      salary_min: template.salary_min?.toString() || '',
      salary_max: template.salary_max?.toString() || '',
      location: template.location || '',
      remote_type: template.remote_type || '',
      category: template.category || '',
      tags: template.tags?.join(', ') || ''
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const templateData = {
        user_id: user.id,
        template_name: formData.template_name,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        responsibilities: formData.responsibilities,
        benefits: formData.benefits,
        job_type: formData.job_type,
        experience_level: formData.experience_level,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        location: formData.location,
        remote_type: formData.remote_type,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };

      if (editingTemplate) {
        await updateJobTemplate(editingTemplate.id, templateData);
        toast({ title: 'Template updated successfully' });
      } else {
        await createJobTemplate(templateData);
        toast({ title: 'Template created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      loadTemplates();
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

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteJobTemplate(id);
      toast({ title: 'Template deleted successfully' });
      loadTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleUseTemplate(templateId: string) {
    try {
      const job = await createJobFromTemplate(templateId);
      toast({ title: 'Job created from template' });
      window.location.href = `/post-job/${job.id}`;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  if (loading && templates.length === 0) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Job Templates</h2>
          <p className="text-muted-foreground">Create reusable templates for faster job posting</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
              <DialogDescription>
                Save a job template for quick reuse
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_type">Job Type</Label>
                  <Input
                    id="job_type"
                    value={formData.job_type}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                    placeholder="Full-time, Part-time, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <Input
                    id="experience_level"
                    value={formData.experience_level}
                    onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                    placeholder="Entry, Mid, Senior"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary_min">Min Salary</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salary_max">Max Salary</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="React, TypeScript, Remote"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates yet. Create your first template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.template_name}</CardTitle>
                <CardDescription>{template.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  {template.job_type && <p>Type: {template.job_type}</p>}
                  {template.location && <p>Location: {template.location}</p>}
                  {template.experience_level && <p>Level: {template.experience_level}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUseTemplate(template.id)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Use
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
