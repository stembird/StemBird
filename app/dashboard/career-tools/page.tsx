'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Mail, Award, TrendingUp, DollarSign } from 'lucide-react';
import CVBuilder from '@/components/career-tools/CVBuilder';
import CoverLetterGenerator from '@/components/career-tools/CoverLetterGenerator';
import SkillAssessments from '@/components/career-tools/SkillAssessments';
import CareerPathPlanner from '@/components/career-tools/CareerPathPlanner';
import SalaryInsights from '@/components/career-tools/SalaryInsights';
import ToolErrorBoundary from '@/components/ToolErrorBoundary';

const TABS = [
  { value: 'cv-builder', label: 'CV', fullLabel: 'CV Templates', icon: FileText },
  { value: 'cover-letter', label: 'Letters', fullLabel: 'Cover Letters', icon: Mail },
  { value: 'assessments', label: 'Skills', fullLabel: 'Assessments', icon: Award },
  { value: 'career-path', label: 'Path', fullLabel: 'Career Path', icon: TrendingUp },
  { value: 'salary', label: 'Pay', fullLabel: 'Salary', icon: DollarSign },
] as const;

export default function CareerToolsPage() {
  const [activeTab, setActiveTab] = useState('cv-builder');
  const [jobId, setJobId] = useState<string | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextJobId = params.get('jobId');
    const nextCvId = params.get('cvId');
    const tab = params.get('tab');
    setJobId(nextJobId);
    setCvId(nextCvId);
    if (tab === 'cover-letter') setActiveTab('cover-letter');
    else if (nextJobId || nextCvId) setActiveTab('cv-builder');
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A66C2] sm:text-3xl">
          Career Tools
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Templates and tools to strengthen your next application
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-5 gap-1 p-1 lg:inline-grid lg:w-auto">
          {TABS.map(({ value, label, fullLabel, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">{label}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cv-builder" className="space-y-4">
          <ToolErrorBoundary fallbackTitle="CV Builder is unavailable">
            <CVBuilder initialJobId={jobId} initialCvId={cvId} />
          </ToolErrorBoundary>
        </TabsContent>

        <TabsContent value="cover-letter" className="space-y-4">
          <ToolErrorBoundary fallbackTitle="Cover Letter Generator is unavailable">
            <CoverLetterGenerator initialJobId={jobId} />
          </ToolErrorBoundary>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <ToolErrorBoundary fallbackTitle="Skill Assessments are unavailable">
            <SkillAssessments />
          </ToolErrorBoundary>
        </TabsContent>

        <TabsContent value="career-path" className="space-y-4">
          <ToolErrorBoundary fallbackTitle="Career Path Planner is unavailable">
            <CareerPathPlanner />
          </ToolErrorBoundary>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <ToolErrorBoundary fallbackTitle="Salary Insights are unavailable">
            <SalaryInsights />
          </ToolErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
