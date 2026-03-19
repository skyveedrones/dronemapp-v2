import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FileText, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function Templates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "municipal",
    config: {
      projectName: "",
      client: "",
      projectDescription: "",
      pilot: "",
      faaLicense: "",
      laancAuth: "",
      warrantyMonths: 12,
      requireGps: true,
      applyWatermark: true,
      exportFormats: ["kml", "geojson", "csv"],
    },
  });

  const { data: templates, isLoading } = trpc.template.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateMutation = trpc.template.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const deleteMutation = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      utils.template.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "municipal",
      config: {
        projectName: "",
        client: "",
        projectDescription: "",
        pilot: "",
        faaLicense: "",
        laancAuth: "",
        warrantyMonths: 12,
        requireGps: true,
        applyWatermark: true,
        exportFormats: ["kml", "geojson", "csv"],
      },
    });
    setEditingTemplate(null);
  };

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      const parsedConfig = typeof template.config === 'string' ? JSON.parse(template.config) : template.config;
      setFormData({
        name: template.name,
        description: template.description || "",
        category: template.category,
        config: {
          projectName: parsedConfig.projectName || "",
          client: parsedConfig.client || "",
          projectDescription: parsedConfig.projectDescription || "",
          pilot: parsedConfig.pilot || "",
          faaLicense: parsedConfig.faaLicense || "",
          laancAuth: parsedConfig.laancAuth || "",
          warrantyMonths: parsedConfig.warrantyMonths || 12,
          requireGps: parsedConfig.requireGps !== undefined ? parsedConfig.requireGps : true,
          applyWatermark: parsedConfig.applyWatermark !== undefined ? parsedConfig.applyWatermark : true,
          exportFormats: parsedConfig.exportFormats || ["kml", "geojson", "csv"],
        },
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Project Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable project templates
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates && templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first template to speed up project creation
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold">{template.name}</h3>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {template.category}
                </span>
                <span className="text-muted-foreground">
                  Used {template.useCount || 0} times
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              Configure default values for new projects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Water Line Mapping"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this template"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Default Project Settings</h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={formData.config.projectName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, projectName: e.target.value },
                      })
                    }
                    placeholder="e.g., Downtown Construction Site Mapping"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input
                    id="client"
                    value={formData.config.client}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, client: e.target.value },
                      })
                    }
                    placeholder="e.g., City of Forney"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Textarea
                    id="projectDescription"
                    value={formData.config.projectDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, projectDescription: e.target.value },
                      })
                    }
                    placeholder="e.g., Aerial documentation for construction progress tracking"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pilot">Pilot Name</Label>
                  <Input
                    id="pilot"
                    value={formData.config.pilot}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, pilot: e.target.value },
                      })
                    }
                    placeholder="e.g., Edward Clay Bechtol"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="faaLicense">FAA License</Label>
                    <Input
                      id="faaLicense"
                      value={formData.config.faaLicense}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            faaLicense: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 5205636"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="laancAuth">LAANC Auth</Label>
                    <Input
                      id="laancAuth"
                      value={formData.config.laancAuth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            laancAuth: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., ALTQU8BOUK0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warrantyMonths">Warranty (months)</Label>
                  <Input
                    id="warrantyMonths"
                    type="number"
                    value={formData.config.warrantyMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          warrantyMonths: parseInt(e.target.value) || 12,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
