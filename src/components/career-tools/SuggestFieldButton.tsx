'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SuggestKind, SuggestRequest, SuggestUsage } from '@/lib/careerSuggest';
import { requestCareerSuggest } from '@/lib/requestCareerSuggest';

export default function SuggestFieldButton({
  kind,
  request,
  onPick,
  onUsage,
  disabled,
  label = 'Suggest',
}: {
  kind: SuggestKind;
  request: Omit<SuggestRequest, 'kind'>;
  onPick: (text: string) => void;
  onUsage?: (usage: SuggestUsage) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  async function run() {
    setLoading(true);
    try {
      const result = await requestCareerSuggest({ kind, ...request });
      if (result.usage) onUsage?.(result.usage);
      if (result.status === 401) {
        toast({ title: 'Sign in required', description: 'Sign in to use AI suggestions.', variant: 'destructive' });
        return;
      }
      if (!result.suggestions?.length) {
        toast({
          title: 'No suggestion',
          description: result.error || 'Could not rewrite this field from the facts on the document.',
          variant: 'destructive',
        });
        return;
      }
      setOptions(result.suggestions);
    } catch (error: any) {
      toast({ title: 'Suggestion failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      <Button type="button" size="sm" variant="outline" disabled={disabled || loading} onClick={run}>
        <Sparkles className="h-3.5 w-3.5 mr-1" />
        {loading ? 'Suggesting…' : label}
      </Button>
      {options.length > 0 && (
        <div className="space-y-1.5 rounded-md border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">Pick a rewrite. It only uses facts already on this document.</p>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full rounded border bg-background px-2 py-1.5 text-left text-xs hover:border-[#0A66C2]"
              onClick={() => {
                onPick(option);
                setOptions([]);
              }}
            >
              {option}
            </button>
          ))}
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOptions([])}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
