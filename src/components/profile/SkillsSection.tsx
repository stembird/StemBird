'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Award, Loader2 } from 'lucide-react';
import type { Skill } from '@/hooks/useProfile';

interface SkillsSectionProps {
  candidateId: string;
  skills: Skill[];
  onUpdate: () => void;
}

export default function SkillsSection({ candidateId, skills, onUpdate }: SkillsSectionProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_category: 'technical',
    proficiency_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    years_of_experience: '',
  });

  const resetForm = () => {
    setFormData({
      skill_name: '',
      skill_category: 'technical',
      proficiency_level: 'intermediate',
      years_of_experience: '',
    });
    setEditingId(null);
  };

  const handleEdit = (skill: Skill) => {
    setFormData({
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || 'technical',
      proficiency_level: skill.proficiency_level || 'intermediate',
      years_of_experience: skill.years_of_experience?.toString() || '',
    });
    setEditingId(skill.id);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        candidate_id: candidateId,
        skill_name: formData.skill_name,
        skill_category: formData.skill_category,
        proficiency_level: formData.proficiency_level,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from('candidate_skills')
          .update(data)
          .eq('id', editingId);
        
        if (error) throw error;
        toast({ title: 'Skill updated' });
      } else {
        const { error } = await (supabase as any)
          .from('candidate_skills')
          .insert(data);
        
        if (error) throw error;
        toast({ title: 'Skill added' });
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
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
      const { error } = await (supabase as any)
        .from('candidate_skills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Skill deleted' });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getProficiencyColor = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-blue-500',
      intermediate: 'bg-green-500',
      advanced: 'bg-purple-500',
      expert: 'bg-orange-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.skill_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Skills</CardTitle>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Skill</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skill_name">Skill Name *</Label>
                  <Input
                    id="skill_name"
                    placeholder="e.g. JavaScript, Project Management"
                    value={formData.skill_name}
                    onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_category">Category</Label>
                  <Select
                    value={formData.skill_category}
                    onValueChange={(value) => setFormData({ ...formData, skill_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="soft">Soft Skills</SelectItem>
                      <SelectItem value="language">Language</SelectItem>
                      <SelectItem value="tool">Tool/Software</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proficiency_level">Proficiency Level</Label>
                  <Select
                    value={formData.proficiency_level}
                    onValueChange={(value: any) => setFormData({ ...formData, proficiency_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    min="0"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
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
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No skills added yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-3 capitalize">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="group relative inline-flex items-center gap-2 border rounded-full px-3 py-1 hover:bg-accent"
                    >
                      <span className="text-sm">{skill.skill_name}</span>
                      {skill.proficiency_level && (
                        <Badge className={`${getProficiencyColor(skill.proficiency_level)} text-white text-xs`}>
                          {skill.proficiency_level}
                        </Badge>
                      )}
                      {skill.years_of_experience && (
                        <span className="text-xs text-muted-foreground">
                          {skill.years_of_experience}y
                        </span>
                      )}
                      <div className="hidden group-hover:flex absolute -top-8 right-0 gap-1 bg-background border rounded-md shadow-lg p-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(skill)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDelete(skill.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
