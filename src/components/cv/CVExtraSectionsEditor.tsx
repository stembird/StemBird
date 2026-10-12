'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isSectionHidden } from '@/lib/cvDesign';
import type { ExtraFieldDef } from '@/lib/cvTemplateExtras';
import type { CVDesign, CVExperience, CVProject } from '@/types/careerDocuments';

type SkillCategory = { title: string; skills: string[] };

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      return String(record.event || record.title || record.platform || '');
    }
    return '';
  });
}

function asProjects(value: unknown): CVProject[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      title: String(record.title || record.name || ''),
      client: String(record.client || record.company || ''),
      year: String(record.year || record.dates || ''),
      description: String(record.description || ''),
    };
  });
}

function asExperience(value: unknown): CVExperience[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const details = Array.isArray(record.details)
      ? record.details.map((line) => String(line))
      : Array.isArray(record.responsibilities)
        ? record.responsibilities.map((line) => String(line))
        : [''];
    return {
      jobTitle: String(record.jobTitle || record.role || ''),
      company: String(record.company || record.organization || ''),
      location: String(record.location || ''),
      dates: String(record.dates || ''),
      details: details.length ? details : [''],
    };
  });
}

function asCategories(value: unknown): SkillCategory[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      title: String(record.title || ''),
      skills: Array.isArray(record.skills) ? record.skills.map((skill) => String(skill)) : [''],
    };
  });
}

export default function CVExtraSectionsEditor({
  fields,
  values,
  design,
  onChange,
}: {
  fields: ExtraFieldDef[];
  values: Record<string, unknown>;
  design?: CVDesign;
  onChange: (key: string, value: unknown) => void;
}) {
  const visible = fields.filter((field) => !isSectionHidden(design, field.key));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((field) => {
        if (field.kind === 'strings') {
          const items = asStrings(values[field.key]);
          return (
            <Card key={field.key}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4 space-y-2">
                {items.map((item, index) => (
                  <div key={`${field.key}-${index}`} className="flex gap-2">
                    <Textarea
                      value={item}
                      rows={2}
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = event.target.value;
                        onChange(field.key, next);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive px-2"
                      onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => onChange(field.key, [...items, ''])}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </CardContent>
            </Card>
          );
        }

        if (field.kind === 'projects') {
          const items = asProjects(values[field.key]);
          return (
            <Card key={field.key}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                {items.map((project, index) => (
                  <div key={`${field.key}-${index}`} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive px-2 h-7"
                        onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={project.title || ''}
                      placeholder="Project title"
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...project, title: event.target.value };
                        onChange(field.key, next);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={project.client || ''}
                        placeholder="Client / company"
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...project, client: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                      <Input
                        value={project.year || ''}
                        placeholder="Year or dates"
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...project, year: event.target.value, dates: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                    </div>
                    <Textarea
                      value={project.description || ''}
                      rows={3}
                      placeholder="What you delivered"
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...project, description: event.target.value };
                        onChange(field.key, next);
                      }}
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChange(field.key, [...items, { title: '', client: '', year: '', description: '' }])}
                >
                  <Plus className="h-4 w-4 mr-1" />Add project
                </Button>
              </CardContent>
            </Card>
          );
        }

        if (field.kind === 'skillCategories') {
          const items = asCategories(values[field.key]);
          return (
            <Card key={field.key}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                {items.map((category, index) => (
                  <div key={`${field.key}-${index}`} className="border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={category.title}
                        placeholder="Category title"
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...category, title: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive px-2"
                        onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {category.skills.map((skill, skillIndex) => (
                      <div key={`${field.key}-${index}-${skillIndex}`} className="flex gap-2">
                        <Textarea
                          value={skill}
                          rows={2}
                          onChange={(event) => {
                            const next = [...items];
                            const skills = [...category.skills];
                            skills[skillIndex] = event.target.value;
                            next[index] = { ...category, skills };
                            onChange(field.key, next);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive px-2"
                          onClick={() => {
                            const next = [...items];
                            next[index] = {
                              ...category,
                              skills: category.skills.filter((_, i) => i !== skillIndex),
                            };
                            onChange(field.key, next);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const next = [...items];
                        next[index] = { ...category, skills: [...category.skills, ''] };
                        onChange(field.key, next);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />Add skill
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChange(field.key, [...items, { title: '', skills: [''] }])}
                >
                  <Plus className="h-4 w-4 mr-1" />Add category
                </Button>
              </CardContent>
            </Card>
          );
        }

        const items = asExperience(values[field.key]);
        return (
          <Card key={field.key}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4 space-y-3">
              {items.map((role, index) => (
                <div key={`${field.key}-${index}`} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive px-2 h-7"
                      onClick={() => onChange(field.key, items.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Role</Label>
                      <Input
                        value={role.jobTitle || ''}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...role, jobTitle: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Organisation</Label>
                      <Input
                        value={role.company || ''}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...role, company: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input
                        value={role.location || ''}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...role, location: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Dates</Label>
                      <Input
                        value={role.dates || ''}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...role, dates: event.target.value };
                          onChange(field.key, next);
                        }}
                      />
                    </div>
                  </div>
                  {(role.details || ['']).map((detail, detailIndex) => (
                    <div key={`${field.key}-${index}-d-${detailIndex}`} className="flex gap-2">
                      <Textarea
                        value={detail}
                        rows={2}
                        onChange={(event) => {
                          const next = [...items];
                          const details = [...(role.details || [])];
                          details[detailIndex] = event.target.value;
                          next[index] = { ...role, details };
                          onChange(field.key, next);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive px-2"
                        onClick={() => {
                          const next = [...items];
                          next[index] = {
                            ...role,
                            details: (role.details || []).filter((_, i) => i !== detailIndex),
                          };
                          onChange(field.key, next);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = [...items];
                      next[index] = { ...role, details: [...(role.details || []), ''] };
                      onChange(field.key, next);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Add point
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChange(field.key, [...items, { jobTitle: '', company: '', location: '', dates: '', details: [''] }])}
              >
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
