'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Briefcase, GraduationCap, Award } from 'lucide-react';

interface ParsedCVData {
  basicInfo: {
    full_name?: string;
    phone?: string;
    location?: string;
    bio?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    github_url?: string;
  };
  professional: {
    current_title?: string;
    years_experience?: number;
  };
  workExperience: Array<{
    company_name: string;
    job_title: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
  }>;
  education: Array<{
    institution_name: string;
    degree_type: string;
    field_of_study: string;
    start_date: string;
    end_date?: string;
  }>;
  skills: Array<{
    skill_name: string;
    skill_category?: string;
    proficiency_level?: string;
  }>;
}

interface CVParseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedCVData | null;
  isParsing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CVParseDialog({
  open,
  onOpenChange,
  parsedData,
  isParsing,
  onConfirm,
  onCancel,
}: CVParseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isParsing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Parsing your CV...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                CV Parsed Successfully
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isParsing
              ? 'Please wait while we extract information from your CV...'
              : 'Review the extracted information below. Click "Apply to Profile" to auto-fill your profile fields.'}
          </DialogDescription>
        </DialogHeader>

        {isParsing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : parsedData ? (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              {parsedData.basicInfo && Object.keys(parsedData.basicInfo).some(key => parsedData.basicInfo[key as keyof typeof parsedData.basicInfo]) && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm pl-6">
                    {parsedData.basicInfo.full_name && (
                      <div><span className="text-muted-foreground">Name:</span> {parsedData.basicInfo.full_name}</div>
                    )}
                    {parsedData.basicInfo.phone && (
                      <div><span className="text-muted-foreground">Phone:</span> {parsedData.basicInfo.phone}</div>
                    )}
                    {parsedData.basicInfo.location && (
                      <div><span className="text-muted-foreground">Location:</span> {parsedData.basicInfo.location}</div>
                    )}
                    {parsedData.basicInfo.linkedin_url && (
                      <div><span className="text-muted-foreground">LinkedIn:</span> ✓</div>
                    )}
                    {parsedData.basicInfo.portfolio_url && (
                      <div><span className="text-muted-foreground">Portfolio:</span> ✓</div>
                    )}
                    {parsedData.basicInfo.github_url && (
                      <div><span className="text-muted-foreground">GitHub:</span> ✓</div>
                    )}
                  </div>
                  {parsedData.basicInfo.bio && (
                    <div className="text-sm pl-6 text-muted-foreground">
                      <span className="font-medium text-foreground">Bio:</span> {parsedData.basicInfo.bio.substring(0, 150)}...
                    </div>
                  )}
                </div>
              )}

              {/* Professional */}
              {parsedData.professional && (parsedData.professional.current_title || parsedData.professional.years_experience) && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Professional
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm pl-6">
                    {parsedData.professional.current_title && (
                      <div><span className="text-muted-foreground">Current Title:</span> {parsedData.professional.current_title}</div>
                    )}
                    {parsedData.professional.years_experience && (
                      <div><span className="text-muted-foreground">Experience:</span> {parsedData.professional.years_experience} years</div>
                    )}
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {parsedData.workExperience && parsedData.workExperience.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Work Experience ({parsedData.workExperience.length})
                  </h3>
                  <div className="space-y-3 pl-6">
                    {parsedData.workExperience.slice(0, 3).map((exp, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-primary/30 pl-3">
                        <div className="font-medium">{exp.job_title}</div>
                        <div className="text-muted-foreground">{exp.company_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exp.start_date).getFullYear()} - {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).getFullYear() : 'N/A'}
                        </div>
                      </div>
                    ))}
                    {parsedData.workExperience.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{parsedData.workExperience.length - 3} more positions
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsedData.education && parsedData.education.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Education ({parsedData.education.length})
                  </h3>
                  <div className="space-y-3 pl-6">
                    {parsedData.education.slice(0, 3).map((edu, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-primary/30 pl-3">
                        <div className="font-medium">{edu.degree_type} in {edu.field_of_study}</div>
                        <div className="text-muted-foreground">{edu.institution_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(edu.start_date).getFullYear()} - {edu.end_date ? new Date(edu.end_date).getFullYear() : 'Present'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {parsedData.skills && parsedData.skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Skills ({parsedData.skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {parsedData.skills.slice(0, 15).map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill.skill_name}
                      </Badge>
                    ))}
                    {parsedData.skills.length > 15 && (
                      <Badge variant="outline">+{parsedData.skills.length - 15} more</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> This information will be added to your profile. You can review and edit each section after applying.
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data to display</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isParsing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isParsing || !parsedData}>
            {isParsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              'Apply to Profile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
