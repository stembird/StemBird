import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  StickyNote,
  Bell,
  Trash2,
  Pin,
  Eye,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApplicationDetailViewProps {
  applicationId: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  event_title: string;
  event_description: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  created_by_role: string;
}

interface Note {
  id: string;
  note_text: string;
  note_type: string;
  is_reminder: boolean;
  reminder_date: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function ApplicationDetailView({ applicationId, open, onClose, onUpdate }: ApplicationDetailViewProps) {
  const [application, setApplication] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const { toast } = useToast();

  useEffect(() => {
    if (open && applicationId) {
      loadApplicationDetails();
    }
  }, [open, applicationId]);

  async function loadApplicationDetails() {
    try {
      setLoading(true);

      // Load application with job details
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(
            id,
            title,
            company,
            location,
            employment_type
          )
        `)
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;
      setApplication(appData);

      // Load timeline - cast to any to avoid type inference issues with new tables
      const timelineQuery = (supabase as any)
        .from('application_timeline')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      
      const { data: timelineData, error: timelineError } = await timelineQuery;

      if (timelineError && timelineError.code !== '42P01') {
        // Ignore table not found error (migration not run yet)
        console.warn('Timeline table not found:', timelineError);
      }
      setTimeline(timelineData || []);

      // Load notes - cast to any to avoid type inference issues with new tables
      const notesQuery = (supabase as any)
        .from('application_notes')
        .select('*')
        .eq('application_id', applicationId)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      const { data: notesData, error: notesError } = await notesQuery;

      if (notesError && notesError.code !== '42P01') {
        // Ignore table not found error (migration not run yet)
        console.warn('Notes table not found:', notesError);
      }
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error loading application details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load application details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw() {
    try {
      setWithdrawing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use direct update instead of RPC until migration is run
      const { error } = await supabase
        .from('job_applications')
        .update({
          withdrawn: true,
          withdrawn_at: new Date().toISOString(),
          withdrawal_reason: withdrawalReason || null,
          status: 'withdrawn' as any
        })
        .eq('id', applicationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Application Withdrawn',
        description: 'Your application has been withdrawn successfully.',
      });

      setShowWithdrawDialog(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast({
        title: 'Error',
        description: 'Failed to withdraw application.',
        variant: 'destructive',
      });
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('application_notes')
        .insert([{
          application_id: applicationId,
          user_id: user.id,
          note_text: newNote,
          note_type: noteType
        }]);

      if (error) {
        if (error.code === '42P01') {
          toast({
            title: 'Feature not available',
            description: 'Notes feature is being set up. Please check back later.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Note Added',
        description: 'Your note has been saved.',
      });

      setNewNote('');
      loadApplicationDetails();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note.',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const { error } = await (supabase as any)
        .from('application_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: 'Note Deleted',
        description: 'Your note has been removed.',
      });

      loadApplicationDetails();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  async function handleTogglePin(noteId: string, currentPinned: boolean) {
    try {
      const { error } = await (supabase as any)
        .from('application_notes')
        .update({ is_pinned: !currentPinned })
        .eq('id', noteId);

      if (error) throw error;

      loadApplicationDetails();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'submitted':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'screening':
      case 'reviewing':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'interview':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'offer':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'withdrawn':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'submitted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'viewed':
        return <Eye className="h-5 w-5 text-blue-500" />;
      case 'status_changed':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'withdrawn':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'note_added':
        return <StickyNote className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <p>Loading application details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!application) {
    return null;
  }

  const canWithdraw = !application.withdrawn && 
    application.status !== 'rejected' && 
    application.status !== 'offer';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{application.job?.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {application.job?.company} • {application.job?.location}
                </p>
              </div>
              <Badge variant={application.withdrawn ? 'secondary' : 'default'}>
                {application.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Applied On</Label>
                      <p className="font-medium">
                        {new Date(application.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(application.status)}
                        <span className="font-medium capitalize">{application.status}</span>
                      </div>
                    </div>
                  </div>

                  {application.withdrawn && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-900">Application Withdrawn</p>
                          {application.withdrawal_reason && (
                            <p className="text-sm text-red-700 mt-1">{application.withdrawal_reason}</p>
                          )}
                          <p className="text-xs text-red-600 mt-1">
                            Withdrawn on {new Date(application.withdrawn_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submitted Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.cv_file_url && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{application.cv_file_name || 'Resume/CV'}</p>
                          {application.cv_file_size && (
                            <p className="text-xs text-muted-foreground">
                              {(application.cv_file_size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(application.cv_file_url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {application.cover_letter && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <p className="font-medium">Cover Letter</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                        {application.cover_letter}
                      </div>
                    </div>
                  )}

                  {!application.cv_file_url && !application.cover_letter && (
                    <p className="text-sm text-muted-foreground">No documents submitted</p>
                  )}
                </CardContent>
              </Card>

              {canWithdraw && (
                <Button
                  variant="destructive"
                  onClick={() => setShowWithdrawDialog(true)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Withdraw Application
                </Button>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="relative">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4 pb-6">
                    <div className="relative flex flex-col items-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2">
                        {getEventIcon(event.event_type)}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-border absolute top-10" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{event.event_title}</p>
                          {event.event_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.event_description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.created_by_role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Add a note or reminder about this application..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id} className={note.is_pinned ? 'border-yellow-300' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(note.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePin(note.id, note.is_pinned)}
                          >
                            <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {notes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No notes yet. Add a note to track your thoughts about this application.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you withdrawing this application?"
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="bg-red-600 hover:bg-red-700"
            >
              {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
