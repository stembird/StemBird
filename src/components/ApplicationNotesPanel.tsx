"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Pin, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  addEmployerNote,
  getEmployerNotes,
  deleteEmployerNote,
  updateEmployerNote,
  type EmployerNote,
} from "@/lib/advancedApplicationManagement";

interface ApplicationNotesPanelProps {
  applicationId: string;
}

const ApplicationNotesPanel = ({ applicationId }: ApplicationNotesPanelProps) => {
  const [notes, setNotes] = useState<EmployerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [applicationId]);

  const loadNotes = async () => {
    try {
      const data = await getEmployerNotes(applicationId);
      setNotes(data);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setSubmitting(true);
    try {
      await addEmployerNote(applicationId, {
        note_text: noteText,
        note_type: noteType,
        is_private: isPrivate,
      });

      toast.success("Note added successfully");
      setNoteText("");
      setNoteType("general");
      setIsPrivate(false);
      loadNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      await updateEmployerNote(noteId, { is_pinned: !currentPinned });
      toast.success(currentPinned ? "Note unpinned" : "Note pinned");
      loadNotes();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteEmployerNote(noteId);
      toast.success("Note deleted successfully");
      loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const getNoteTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: "bg-gray-500",
      screening: "bg-blue-500",
      interview: "bg-purple-500",
      reference_check: "bg-indigo-500",
      background_check: "bg-yellow-500",
      offer: "bg-green-500",
      rejection_reason: "bg-red-500",
      follow_up: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  if (loading) {
    return <div className="text-center py-4">Loading notes...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="reference_check">Reference Check</SelectItem>
                <SelectItem value="background_check">Background Check</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="rejection_reason">Rejection Reason</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your note here..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private-note"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="private-note" className="flex items-center gap-2 cursor-pointer">
              <Lock className="h-4 w-4" />
              Private note (only visible to you)
            </Label>
          </div>

          <Button onClick={handleAddNote} disabled={submitting} className="w-full">
            {submitting ? "Adding..." : "Add Note"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Notes ({notes.length})</h3>
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notes yet. Add your first note above.</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={note.is_pinned ? "border-primary" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getNoteTypeColor(note.note_type)}>
                      {note.note_type.replace(/_/g, " ")}
                    </Badge>
                    {note.is_private && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    )}
                    {note.is_pinned && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(note.id, note.is_pinned)}
                    >
                      <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
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
                <p className="text-sm whitespace-pre-wrap mb-2">{note.note_text}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ApplicationNotesPanel;
