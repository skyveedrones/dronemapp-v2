import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

interface ProjectAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  userId: number;
  userName: string;
}

export function ProjectAssignmentDialog({
  open,
  onOpenChange,
  clientId,
  userId,
  userName,
}: ProjectAssignmentDialogProps) {
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [initialAssignments, setInitialAssignments] = useState<Set<number>>(new Set());

  // Fetch all projects in the client folder
  const { data: allProjects, isLoading: loadingProjects } = 
    trpc.clientPortal.getClientProjectsForAssignment.useQuery(
      { clientId },
      { enabled: open }
    );

  // Fetch user's current assignments
  const { data: userAssignments, isLoading: loadingAssignments } = 
    trpc.clientPortal.getUserProjects.useQuery(
      { clientId, userId },
      { enabled: open }
    );

  // Initialize selected projects when data loads
  useEffect(() => {
    if (userAssignments) {
      const assignedProjectIds = new Set(
        userAssignments.map(a => a.projectId).filter((id): id is number => id !== null)
      );
      setSelectedProjects(assignedProjectIds);
      setInitialAssignments(assignedProjectIds);
    }
  }, [userAssignments]);

  const utils = trpc.useUtils();

  const assignMutation = trpc.clientPortal.assignProjectToUser.useMutation({
    onSuccess: () => {
      utils.clientPortal.getUserProjects.invalidate({ clientId, userId });
      utils.clientPortal.getUsersWithAssignments.invalidate({ clientId });
    },
  });

  const unassignMutation = trpc.clientPortal.unassignProjectFromUser.useMutation({
    onSuccess: () => {
      utils.clientPortal.getUserProjects.invalidate({ clientId, userId });
      utils.clientPortal.getUsersWithAssignments.invalidate({ clientId });
    },
  });

  const bulkAssignMutation = trpc.clientPortal.bulkAssignProjects.useMutation({
    onSuccess: () => {
      utils.clientPortal.getUserProjects.invalidate({ clientId, userId });
      utils.clientPortal.getUsersWithAssignments.invalidate({ clientId });
    },
  });

  const bulkUnassignMutation = trpc.clientPortal.bulkUnassignProjects.useMutation({
    onSuccess: () => {
      utils.clientPortal.getUserProjects.invalidate({ clientId, userId });
      utils.clientPortal.getUsersWithAssignments.invalidate({ clientId });
    },
  });

  const toggleProject = (projectId: number) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    const toAssign = Array.from(selectedProjects).filter(id => !initialAssignments.has(id));
    const toUnassign = Array.from(initialAssignments).filter(id => !selectedProjects.has(id));

    try {
      if (toAssign.length > 0) {
        await bulkAssignMutation.mutateAsync({
          clientId,
          userId,
          projectIds: toAssign,
        });
      }

      if (toUnassign.length > 0) {
        await bulkUnassignMutation.mutateAsync({
          clientId,
          userId,
          projectIds: toUnassign,
        });
      }

      toast.success("Project assignments updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update assignments:", error);
      toast.error("Failed to update project assignments");
    }
  };

  const handleSelectAll = () => {
    if (allProjects) {
      setSelectedProjects(new Set(allProjects.map(p => p.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedProjects(new Set());
  };

  const isLoading = loadingProjects || loadingAssignments;
  const isSaving = assignMutation.isPending || unassignMutation.isPending || 
                   bulkAssignMutation.isPending || bulkUnassignMutation.isPending;

  const hasChanges = 
    selectedProjects.size !== initialAssignments.size ||
    Array.from(selectedProjects).some(id => !initialAssignments.has(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle>Manage Project Access for {userName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-4">
              <p className="text-sm text-muted-foreground">
                {selectedProjects.size} of {allProjects?.length || 0} projects selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isSaving}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isSaving}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-md p-4 max-h-[50vh] overflow-y-auto">
              {allProjects && allProjects.length > 0 ? (
                <div className="space-y-3">
                  {allProjects.map((project) => {
                    const isSelected = selectedProjects.has(project.id);
                    return (
                      <div
                        key={project.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => toggleProject(project.id)}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`project-${project.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {project.name}
                            </Label>
                            {initialAssignments.has(project.id) && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Currently Assigned
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {project.description}
                            </p>
                          )}
                          {project.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {project.location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No projects found in this client folder
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-6 mt-auto border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
