/**
 * Edit Project Dialog
 * Modal form for editing existing drone mapping projects
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectLogoDialog } from "@/components/ProjectLogoDialog";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { Calendar, ImagePlus, Loader2, MapPin, Plane, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  enableLogoManagement?: boolean;
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
  enableLogoManagement = false,
}: EditProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [flightDate, setFlightDate] = useState("");
  const [warrantyStartDate, setWarrantyStartDate] = useState("");
  const [warrantyEndDate, setWarrantyEndDate] = useState("");
  const [dronePilot, setDronePilot] = useState("");
  const [faaLicenseNumber, setFaaLicenseNumber] = useState("");
  const [laancAuthNumber, setLaancAuthNumber] = useState("");
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setLocation(project.location || "");
      setClientName(project.clientName || "");
      setStatus(project.status);
      setFlightDate(
        project.flightDate
          ? new Date(project.flightDate).toISOString().split("T")[0]
          : ""
      );
      setWarrantyStartDate(
        project.warrantyStartDate
          ? new Date(project.warrantyStartDate).toISOString().split("T")[0]
          : ""
      );
      setWarrantyEndDate(
        project.warrantyEndDate
          ? new Date(project.warrantyEndDate).toISOString().split("T")[0]
          : ""
      );
      setDronePilot(project.dronePilot || "");
      setFaaLicenseNumber(project.faaLicenseNumber || "");
      setLaancAuthNumber(project.laancAuthNumber || "");
    }
  }, [project]);

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully!");
      utils.project.list.invalidate();
      if (project) {
        utils.project.get.invalidate({ id: project.id });
      }
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to update project", {
        description: error.message,
      });
    },
  });

  const updateWarranty = trpc.warranty.updateWarrantyDates.useMutation({
    onError: (error) => {
      toast.error("Failed to update warranty dates", {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    // Validate warranty dates
    if (warrantyStartDate && warrantyEndDate) {
      const start = new Date(warrantyStartDate);
      const end = new Date(warrantyEndDate);
      if (end <= start) {
        toast.error("Warranty end date must be after start date");
        return;
      }
    }

    // Update project details
    updateProject.mutate({
      id: project.id,
      name: name.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      clientName: clientName.trim() || null,
      status,
      flightDate: flightDate ? new Date(flightDate) : null,
      dronePilot: dronePilot.trim() || null,
      faaLicenseNumber: faaLicenseNumber.trim() || null,
      laancAuthNumber: laancAuthNumber.trim() || null,
    });

    // Update warranty dates separately
    updateWarranty.mutate({
      projectId: project.id,
      warrantyStartDate: warrantyStartDate || null,
      warrantyEndDate: warrantyEndDate || null,
    });
  };

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Edit Project
            </DialogTitle>
            <DialogDescription>
              Update your project details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Project Name - Required */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Downtown Construction Site Survey"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="edit-status" className="text-sm font-medium">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of the project scope, objectives, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="edit-location" className="text-sm font-medium">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />
                Location
              </Label>
              <Input
                id="edit-location"
                placeholder="e.g., 123 Main St, City, State or GPS coordinates"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Client Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-clientName" className="text-sm font-medium">
                <User className="inline h-3.5 w-3.5 mr-1" />
                Client Name
              </Label>
              <Input
                id="edit-clientName"
                placeholder="e.g., ABC Construction Company"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Flight Date */}
            <div className="grid gap-2">
              <Label htmlFor="edit-flightDate" className="text-sm font-medium">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Flight Date
              </Label>
              <Input
                id="edit-flightDate"
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Project Branding */}
            {enableLogoManagement && (
              <div className="border-t border-border pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <ImagePlus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Project Branding</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload or change the project logo used in project headers and reports.
                </p>
                <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {project.logoUrl ? (
                      <img
                        src={`${project.logoUrl}?t=${project.updatedAt}`}
                        alt="Project Logo"
                        className="h-10 w-10 object-contain rounded border border-border bg-card p-1"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.logoUrl ? "Logo uploaded" : "No logo uploaded"}</p>
                      <p className="text-xs text-muted-foreground truncate">Manage logo image file</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border"
                    onClick={() => setLogoDialogOpen(true)}
                  >
                    {project.logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                </div>
              </div>
            )}

            {/* Drone Pilot Section */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Plane className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Drone Pilot Information</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Record pilot credentials and flight authorizations.
              </p>
              
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-dronePilot" className="text-sm font-medium">
                    Drone Pilot Name
                  </Label>
                  <Input
                    id="edit-dronePilot"
                    placeholder="e.g., John Smith"
                    value={dronePilot}
                    onChange={(e) => setDronePilot(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-faaLicense" className="text-sm font-medium">
                      FAA License #
                    </Label>
                    <Input
                      id="edit-faaLicense"
                      placeholder="e.g., FA12345678"
                      value={faaLicenseNumber}
                      onChange={(e) => setFaaLicenseNumber(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-laancAuth" className="text-sm font-medium">
                      LAANC Auth #
                    </Label>
                    <Input
                      id="edit-laancAuth"
                      placeholder="e.g., LAANC-2024-001"
                      value={laancAuthNumber}
                      onChange={(e) => setLaancAuthNumber(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Warranty Section */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Warranty Information</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Track project warranty periods and set up automated reminders.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-warrantyStart" className="text-sm font-medium">
                    Warranty Start
                  </Label>
                  <Input
                    id="edit-warrantyStart"
                    type="date"
                    value={warrantyStartDate}
                    onChange={(e) => setWarrantyStartDate(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-warrantyEnd" className="text-sm font-medium">
                    Warranty End
                  </Label>
                  <Input
                    id="edit-warrantyEnd"
                    type="date"
                    value={warrantyEndDate}
                    onChange={(e) => setWarrantyEndDate(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={updateProject.isPending || updateWarranty.isPending || !name.trim()}
            >
              {(updateProject.isPending || updateWarranty.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {enableLogoManagement && project && (
        <ProjectLogoDialog
          projectId={project.id}
          currentLogoUrl={project.logoUrl}
          open={logoDialogOpen}
          onOpenChange={setLogoDialogOpen}
        />
      )}
    </>
  );
}
