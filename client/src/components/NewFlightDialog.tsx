import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, Loader2, Plane, User, FileText, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface NewFlightDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewFlightDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: NewFlightDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [dronePilot, setDronePilot] = useState("");
  const [faaLicenseNumber, setFaaLicenseNumber] = useState("");
  const [laancAuthNumber, setLaancAuthNumber] = useState("");

  const utils = trpc.useUtils();

  // Pre-fill pilot info from user defaults when dialog opens
  useEffect(() => {
    if (open && user) {
      setDronePilot(user.defaultDronePilot || "");
      setFaaLicenseNumber(user.defaultFaaLicenseNumber || "");
      setLaancAuthNumber(user.defaultLaancAuthNumber || "");
    }
  }, [open, user]);

  const createFlight = trpc.flight.create.useMutation({
    onSuccess: () => {
      toast.success("Flight created successfully!");
      utils.flight.list.invalidate({ projectId });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to create flight", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setFlightDate("");
    setDronePilot("");
    setFaaLicenseNumber("");
    setLaancAuthNumber("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a flight name");
      return;
    }

    createFlight.mutate({
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      flightDate: flightDate ? new Date(flightDate) : undefined,
      dronePilot: dronePilot.trim() || undefined,
      faaLicenseNumber: faaLicenseNumber.trim() || undefined,
      laancAuthNumber: laancAuthNumber.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            New Flight
          </DialogTitle>
          <DialogDescription>
            Create a new flight folder to organize drone media from a specific flight session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Flight Details Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flight-name">Flight Name *</Label>
              <Input
                id="flight-name"
                placeholder="e.g., Morning Survey Flight 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createFlight.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight-date">Flight Date</Label>
              <div className="relative">
                <Input
                  id="flight-date"
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  disabled={createFlight.isPending}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight-description">Description (Optional)</Label>
              <Textarea
                id="flight-description"
                placeholder="Add notes about this flight..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createFlight.isPending}
                rows={2}
              />
            </div>
          </div>

          {/* Pilot Information Section */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Pilot Information
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="drone-pilot">Drone Pilot Name</Label>
              <Input
                id="drone-pilot"
                placeholder="Enter pilot name"
                value={dronePilot}
                onChange={(e) => setDronePilot(e.target.value)}
                disabled={createFlight.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faa-license" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  FAA License #
                </Label>
                <Input
                  id="faa-license"
                  placeholder="e.g., 1234567"
                  value={faaLicenseNumber}
                  onChange={(e) => setFaaLicenseNumber(e.target.value)}
                  disabled={createFlight.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="laanc-auth" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  LAANC Auth #
                </Label>
                <Input
                  id="laanc-auth"
                  placeholder="e.g., LAANC-2025-001"
                  value={laancAuthNumber}
                  onChange={(e) => setLaancAuthNumber(e.target.value)}
                  disabled={createFlight.isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createFlight.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createFlight.isPending}>
              {createFlight.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Flight"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
