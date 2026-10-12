"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { rateApplication } from "@/lib/advancedApplicationManagement";

interface ApplicationRatingDialogProps {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: () => void;
}

const ApplicationRatingDialog = ({
  applicationId,
  open,
  onOpenChange,
  onRated,
}: ApplicationRatingDialogProps) => {
  const [overallScore, setOverallScore] = useState(0);
  const [technicalScore, setTechnicalScore] = useState(0);
  const [experienceScore, setExperienceScore] = useState(0);
  const [cultureFitScore, setCultureFitScore] = useState(0);
  const [communicationScore, setCommunicationScore] = useState(0);
  const [ratingNotes, setRatingNotes] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (overallScore === 0) {
      toast.error("Please provide an overall score");
      return;
    }

    setSubmitting(true);
    try {
      await rateApplication(applicationId, {
        overall_score: overallScore,
        technical_score: technicalScore || undefined,
        experience_score: experienceScore || undefined,
        culture_fit_score: cultureFitScore || undefined,
        communication_score: communicationScore || undefined,
        rating_notes: ratingNotes || undefined,
        recommendation: recommendation as any || undefined,
      });

      toast.success("Rating submitted successfully");
      onOpenChange(false);
      onRated?.();
      
      // Reset form
      setOverallScore(0);
      setTechnicalScore(0);
      setExperienceScore(0);
      setCultureFitScore(0);
      setCommunicationScore(0);
      setRatingNotes("");
      setRecommendation("");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Application</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <StarRating
            value={overallScore}
            onChange={setOverallScore}
            label="Overall Score *"
          />

          <StarRating
            value={technicalScore}
            onChange={setTechnicalScore}
            label="Technical Skills"
          />

          <StarRating
            value={experienceScore}
            onChange={setExperienceScore}
            label="Experience Level"
          />

          <StarRating
            value={cultureFitScore}
            onChange={setCultureFitScore}
            label="Culture Fit"
          />

          <StarRating
            value={communicationScore}
            onChange={setCommunicationScore}
            label="Communication"
          />

          <div className="space-y-2">
            <Label>Recommendation</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "strong_yes", label: "Strong Yes", color: "bg-green-600" },
                { value: "yes", label: "Yes", color: "bg-green-500" },
                { value: "maybe", label: "Maybe", color: "bg-yellow-500" },
                { value: "no", label: "No", color: "bg-red-500" },
                { value: "strong_no", label: "Strong No", color: "bg-red-600" },
              ].map((rec) => (
                <Button
                  key={rec.value}
                  type="button"
                  variant={recommendation === rec.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecommendation(rec.value)}
                  className={recommendation === rec.value ? rec.color : ""}
                >
                  {rec.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={ratingNotes}
              onChange={(e) => setRatingNotes(e.target.value)}
              placeholder="Add any additional comments about this candidate..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationRatingDialog;
