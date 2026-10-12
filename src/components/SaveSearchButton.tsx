"use client";

import { useState } from "react";
import { Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveSearch } from "@/lib/savedSearches";
import { supabase } from "@/integrations/supabase/client";

interface SaveSearchButtonProps {
  searchParams: Record<string, any>;
  className?: string;
}

export const SaveSearchButton = ({ searchParams, className }: SaveSearchButtonProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'instant' | 'daily' | 'weekly'>('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    return !!user;
  };

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen) {
      const authenticated = await checkAuth();
      if (!authenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to save searches",
          variant: "destructive"
        });
        return;
      }
    }
    setOpen(newOpen);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this search",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Saving search with params:", { name, searchParams, emailAlerts, alertFrequency });
      await saveSearch(name, searchParams, emailAlerts, alertFrequency);
      
      toast({
        title: "Search Saved",
        description: emailAlerts 
          ? "Search saved! Email alerts will be available once the system fully initializes (24-48 hours)."
          : "Search saved successfully"
      });

      setOpen(false);
      setName("");
      setEmailAlerts(false);
      setAlertFrequency('daily');
    } catch (error: any) {
      console.error("Error saving search:", error);
      const errorMessage = error?.message || "Failed to save search. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Save className="h-4 w-4 mr-2" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save This Search</DialogTitle>
          <DialogDescription>
            Save your search criteria and optionally receive email alerts when new matching jobs are posted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Search Name</Label>
            <Input
              id="name"
              placeholder="e.g., Software Engineer in Nairobi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-alerts">Email Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new matching jobs
              </p>
            </div>
            <Switch
              id="email-alerts"
              checked={emailAlerts}
              onCheckedChange={setEmailAlerts}
            />
          </div>

          {emailAlerts && (
            <div className="grid gap-2">
              <Label htmlFor="frequency">Alert Frequency</Label>
              <Select value={alertFrequency} onValueChange={(value: any) => setAlertFrequency(value)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant (as jobs are posted)</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
