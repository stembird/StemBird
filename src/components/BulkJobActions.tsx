'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createBulkJobAction, executeBulkJobAction } from '@/lib/jobManagement';
import { Loader2 } from 'lucide-react';

interface BulkJobActionsProps {
  selectedJobIds: string[];
  onComplete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkJobActions({ selectedJobIds, onComplete, open, onOpenChange }: BulkJobActionsProps) {
  const [actionType, setActionType] = useState<string>('');
  const [parameters, setParameters] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleExecute() {
    if (!actionType) {
      toast({
        title: 'Error',
        description: 'Please select an action',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Create bulk action
      const action = await createBulkJobAction(
        selectedJobIds,
        actionType as any,
        parameters
      );

      // Execute it
      const results = await executeBulkJobAction(action.id);

      toast({
        title: 'Bulk action completed',
        description: `Successfully processed ${selectedJobIds.length} jobs`
      });

      onOpenChange(false);
      onComplete();
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

  function renderParameterInputs() {
    switch (actionType) {
      case 'update_status':
        return (
          <div>
            <Label>New Status</Label>
            <Select
              value={parameters.status || ''}
              onValueChange={(value) => setParameters({ ...parameters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Job Actions</DialogTitle>
          <DialogDescription>
            Apply an action to {selectedJobIds.length} selected job{selectedJobIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Action</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update_status">Update Status</SelectItem>
                <SelectItem value="unpromote">Remove Promotion</SelectItem>
                <SelectItem value="unfeature">Remove Featured</SelectItem>
                <SelectItem value="renew">Renew Jobs</SelectItem>
                <SelectItem value="expire">Expire Jobs</SelectItem>
                <SelectItem value="delete">Delete Jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderParameterInputs()}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleExecute} disabled={loading || !actionType}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Execute
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
