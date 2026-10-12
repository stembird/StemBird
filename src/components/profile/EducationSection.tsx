'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GraduationCap, Loader2 } from 'lucide-react';
import type { Education } from '@/hooks/useProfile';
import { format } from 'date-fns';

interface EducationSectionProps {
  candidateId: string;
  education: Education[];
  onUpdate: () => void;
}

export default function EducationSection({ candidateId, education, onUpdate }: EducationSectionProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    institution_name: '',
    degree_type: '',
    field_of_study: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    grade: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      institution_name: '',
      degree_type: '',
      field_of_study: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      grade: '',
      description: '',
    });
    setEditingId(null);
  };

  const handleEdit = (edu: Education) => {
    setFormData({
      institution_name: edu.institution_name,
      degree_type: edu.degree_type,
      field_of_study: edu.field_of_study,
      location: edu.location || '',
      start_date: edu.start_date,
      end_date: edu.end_date || '',
      is_current: edu.is_current,
      grade: edu.grade || '',
      description: edu.description || '',
    });
    setEditingId(edu.id);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        candidate_id: candidateId,
        institution_name: formData.institution_name,
        degree_type: formData.degree_type,
        field_of_study: formData.field_of_study,
        location: formData.location || null,
        start_date: formData.start_date,
        end_date: formData.is_current ? null : formData.end_date || null,
        is_current: formData.is_current,
        grade: formData.grade || null,
        description: formData.description || null,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from('candidate_education')
          .update(data)
          .eq('id', editingId);
        
        if (error) throw error;
        toast({ title: 'Education updated' });
      } else {
        const { error } = await (supabase as any)
          .from('candidate_education')
          .insert(data);
        
        if (error) throw error;
        toast({ title: 'Education added' });
      }

      setIsOpen(false);
      resetForm();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education?')) return;

    try {
      const { error } = await (supabase as any)
        .from('candidate_education')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Education deleted' });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Education</CardTitle>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Education
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Education</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institution_name">Institution Name *</Label>
                  <Input
                    id="institution_name"
                    value={formData.institution_name}
                    onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="degree_type">Degree Type *</Label>
                    <Input
                      id="degree_type"
                      placeholder="e.g. Bachelor's, Master's"
                      value={formData.degree_type}
                      onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="field_of_study">Field of Study *</Label>
                    <Input
                      id="field_of_study"
                      placeholder="e.g. Computer Science"
                      value={formData.field_of_study}
                      onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      disabled={formData.is_current}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_current"
                    checked={formData.is_current}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked as boolean })}
                  />
                  <Label htmlFor="is_current">I currently study here</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">Grade/GPA</Label>
                  <Input
                    id="grade"
                    placeholder="e.g. First Class, 3.8 GPA"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details, achievements, etc."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {education.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No education added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{edu.degree_type} in {edu.field_of_study}</h4>
                    <p className="text-sm text-muted-foreground">{edu.institution_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(edu.start_date), 'MMM yyyy')} - {edu.is_current ? 'Present' : edu.end_date ? format(new Date(edu.end_date), 'MMM yyyy') : 'N/A'}
                      {edu.location && ` • ${edu.location}`}
                    </p>
                    {edu.grade && (
                      <p className="text-sm mt-1">Grade: {edu.grade}</p>
                    )}
                    {edu.description && (
                      <p className="text-sm mt-2">{edu.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(edu)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(edu.id)}>
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
