/**
 * Create Project Dialog
 * Modal form for creating new drone mapping projects
 * Auto-fills pilot information from user's default settings
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, Loader2, MapPin, Plane, Shield, User, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [dronePilot, setDronePilot] = useState("");
  const [faaLicense, setFaaLicense] = useState("");
  const [laancAuth, setLaancAuth] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const utils = trpc.useUtils();

  // Fetch user's default pilot settings
  const { data: pilotSettings } = trpc.pilotSettings.get.useQuery();
  
  // Fetch available templates
  const { data: templates } = trpc.template.list.useQuery();

  // Auto-fill pilot settings when dialog opens
  useEffect(() => {
    if (open && pilotSettings) {
      setDronePilot(pilotSettings.defaultDronePilot || "");
      setFaaLicense(pilotSettings.defaultFaaLicenseNumber || "");
      setLaancAuth(pilotSettings.defaultLaancAuthNumber || "");
    }
  }, [open, pilotSettings]);
  
  // Auto-fill form when template is selected
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== "none" && templates) {
      const template = templates.find((t: any) => t.id === parseInt(selectedTemplateId));
      if (template && template.config) {
        try {
          const values = JSON.parse(template.config);
          if (values.projectName) setName(values.projectName);
          if (values.client) setClientName(values.client);
          if (values.projectDescription) setDescription(values.projectDescription);
          if (values.location) setLocation(values.location);
          if (values.pilot) setDronePilot(values.pilot);
          if (values.faaLicense) setFaaLicense(values.faaLicense);
          if (values.laancAuth) setLaancAuth(values.laancAuth);
          
          toast.success("Template applied!", {
            description: `Fields auto-filled from "${template.name}" template.`,
          });
        } catch (error) {
          console.error("Failed to parse template config:", error);
          toast.error("Failed to apply template");
        }
      }
    } else if (selectedTemplateId === "none") {
      // Reset to default pilot settings when "none" is selected
      if (pilotSettings) {
        setDronePilot(pilotSettings.defaultDronePilot || "");
        setFaaLicense(pilotSettings.defaultFaaLicenseNumber || "");
        setLaancAuth(pilotSettings.defaultLaancAuthNumber || "");
      }
      setClientName("");
      setLocation("");
    }
  }, [selectedTemplateId, templates, pilotSettings]);

  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created successfully!", {
        description: `"${name}" has been added to your projects.`,
      });
      
      // If pilot info was provided, update the project with it
      if (dronePilot || faaLicense || laancAuth) {
        updateProject.mutate({
          id: data.id,
          dronePilot: dronePilot || null,
          faaLicenseNumber: faaLicense || null,
          laancAuthNumber: laancAuth || null,
        });
      }
      
      utils.project.list.invalidate();
      utils.project.count.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to create project", {
        description: error.message,
      });
    },
  });

  const updateProject = trpc.project.update.useMutation({
    onError: (error) => {
      console.error("Failed to update pilot info:", error);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLocation("");
    setClientName("");
    setFlightDate("");
    setDronePilot("");
    setFaaLicense("");
    setLaancAuth("");
    setSelectedTemplateId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    createProject.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      clientName: clientName.trim() || undefined,
      flightDate: flightDate ? new Date(flightDate) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Create New Project
            </DialogTitle>
            <DialogDescription>
              Add a new drone mapping project. You can add media and map data
              after creating the project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Template Selection */}
            {templates && templates.length > 0 && (
              <div className="grid gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <Label htmlFor="template" className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Use Template (Optional)
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select a template to auto-fill fields..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Start from scratch</SelectItem>
                    {templates.map((template: any) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                        {template.category && (
                          <span className="text-xs text-muted-foreground ml-2">({template.category})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Templates auto-fill common fields to save time. You can still edit any field after applying.
                </p>
              </div>
            )}
            
            {/* Project Name - Required */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Downtown Construction Site Survey"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your project a descriptive name for easy identification.
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project scope, objectives, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-sm font-medium">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., 123 Main St, City, State or GPS coordinates"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Client Name */}
            <div className="grid gap-2">
              <Label htmlFor="clientName" className="text-sm font-medium">
                <User className="inline h-3.5 w-3.5 mr-1" />
                Client Name
              </Label>
              <Input
                id="clientName"
                placeholder="e.g., ABC Construction Company"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            {/* Flight Date */}
            <div className="grid gap-2">
              <Label htmlFor="flightDate" className="text-sm font-medium">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Flight Date
              </Label>
              <Input
                id="flightDate"
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                When was or will the drone flight be conducted?
              </p>
            </div>

            {/* Pilot Information Section */}
            <div className="border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Plane className="h-4 w-4 text-emerald-500" />
                Pilot Information
                {pilotSettings?.defaultDronePilot && (
                  <span className="text-xs text-muted-foreground font-normal">(auto-filled from settings)</span>
                )}
              </h4>
              
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="dronePilot" className="text-sm font-medium">
                    Drone Pilot
                  </Label>
                  <Input
                    id="dronePilot"
                    placeholder="e.g., John Smith"
                    value={dronePilot}
                    onChange={(e) => setDronePilot(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="faaLicense" className="text-sm font-medium flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      FAA License #
                    </Label>
                    <Input
                      id="faaLicense"
                      placeholder="e.g., FA12345678"
                      value={faaLicense}
                      onChange={(e) => setFaaLicense(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="laancAuth" className="text-sm font-medium">
                      LAANC Auth #
                    </Label>
                    <Input
                      id="laancAuth"
                      placeholder="e.g., LAANC-2024-001"
                      value={laancAuth}
                      onChange={(e) => setLaancAuth(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
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
              disabled={createProject.isPending || !name.trim()}
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
