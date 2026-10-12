import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Loader2 } from "lucide-react";

interface ReportJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReport: (message: string) => Promise<void>;
  jobTitle: string;
}

export function ReportJobDialog({ open, onOpenChange, onReport, jobTitle }: ReportJobDialogProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onReport(message);
      onOpenChange(false);
      setMessage("");
    } catch (err) {
      setError("Failed to submit report. Please try again.");
      console.error("Error reporting job:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Flag Job Posting</DialogTitle>
          <DialogDescription>
            Please provide details about why you're flagging "{jobTitle}". Your feedback helps us maintain the quality of our job board.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Textarea
              id="message"
              placeholder="Please provide details about your concern (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Flag Job'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
