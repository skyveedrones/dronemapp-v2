/**
 * Client Projects Page
 * Manage projects assigned to a specific client
 */

import DashboardLayout from "@/components/DashboardLayout";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FolderPlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ClientProjects() {
  const { clientId } = useParams<{ clientId: string }>();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  // Fetch client details
  const { data: client, isLoading: clientLoading } = trpc.clientPortal.get.useQuery(
    { id: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  // Fetch projects assigned to this client
  const { data: clientProjects, isLoading: projectsLoading, refetch: refetchClientProjects } = 
    trpc.clientPortal.getProjects.useQuery(
      { clientId: parseInt(clientId || "0") },
      { enabled: !!clientId }
    );

  // Fetch all user's projects for assignment
  const { data: allProjects } = trpc.project.list.useQuery();

  // Assign projects mutation
  const assignProjects = trpc.clientPortal.assignProjects.useMutation({
    onSuccess: () => {
      toast.success("Projects assigned successfully");
      setAssignDialogOpen(false);
      setSelectedProjects([]);
      refetchClientProjects();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Unassign project mutation
  const unassignProject = trpc.clientPortal.unassignProject.useMutation({
    onSuccess: () => {
      toast.success("Project removed from client");
      refetchClientProjects();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAssignProjects = () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select at least one project");
      return;
    }
    assignProjects.mutate({
      clientId: parseInt(clientId || "0"),
      projectIds: selectedProjects,
    });
  };

  const handleUnassignProject = (projectId: number) => {
    unassignProject.mutate({
      clientId: parseInt(clientId || "0"),
      projectId,
    });
  };

  // Get projects that are not already assigned to this client
  const unassignedProjects = allProjects?.filter(
    (p) => !clientProjects?.some((cp) => cp.id === p.id)
  ) || [];

  if (clientLoading || projectsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Client not found</p>
          <Link href="/clients">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <BackToDashboard />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display">{client.name}</h1>
              <p className="text-muted-foreground">
                {clientProjects?.length || 0} project{clientProjects?.length !== 1 ? "s" : ""} assigned
              </p>
            </div>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Assign Projects
          </Button>
        </div>

        {/* Projects Grid */}
        {clientProjects && clientProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientProjects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="group relative cursor-pointer hover:border-primary/50 transition-colors">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnassignProject(project.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive z-10"
                    title="Remove from client"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.location || "No location set"}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded-full ${
                        project.status === "completed" 
                          ? "bg-primary/20 text-primary" 
                          : project.status === "active"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {project.status}
                      </span>
                      <span>{project.mediaCount || 0} media</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects assigned</h3>
              <p className="text-muted-foreground text-center mb-4">
                Assign projects to this client so they can view them in their portal.
              </p>
              <Button onClick={() => setAssignDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Assign Projects
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assign Projects Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Projects to {client.name}</DialogTitle>
            <DialogDescription>
              Select projects to make them visible in this client's portal.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {unassignedProjects.length > 0 ? (
              unassignedProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProjects([...selectedProjects, project.id]);
                      } else {
                        setSelectedProjects(selectedProjects.filter((id) => id !== project.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.location || "No location"}
                    </p>
                  </div>
                </label>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                All your projects are already assigned to this client.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignProjects}
              disabled={selectedProjects.length === 0 || assignProjects.isPending}
            >
              {assignProjects.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Assign {selectedProjects.length > 0 ? `(${selectedProjects.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
