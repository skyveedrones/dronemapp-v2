/**
 * Clients Management Page
 * Allows admins to create and manage client organizations
 * Clients can be assigned projects and invited users
 */

import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Building2,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Clients() {
  const { user, loading: authLoading } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  // Form state for creating a new client
  const [newClient, setNewClient] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    address: "",
  });

  // Fetch clients
  const {
    data: clients,
    isLoading,
    refetch,
  } = trpc.clientPortal.list.useQuery();

  // Create client mutation
  const createClientMutation = trpc.clientPortal.create.useMutation({
    onSuccess: () => {
      toast.success("Client created successfully");
      setCreateDialogOpen(false);
      setNewClient({
        name: "",
        contactName: "",
        contactEmail: "",
        phone: "",
        address: "",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  // Delete client mutation
  const deleteClientMutation = trpc.clientPortal.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  const handleCreateClient = () => {
    if (!newClient.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    createClientMutation.mutate({
      name: newClient.name,
      contactName: newClient.contactName || undefined,
      contactEmail: newClient.contactEmail || undefined,
      phone: newClient.phone || undefined,
      address: newClient.address || undefined,
    });
  };

  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate({ id: clientToDelete });
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client organizations and their project access
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Client Portal Feature
                </p>
                <p className="text-sm text-muted-foreground">
                  Create client organizations to group projects together. Invite
                  clients to view their assigned projects through a dedicated
                  portal. Clients can only see projects you assign to them.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        {clients && clients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="group hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {client.logoUrl ? (
                        <img
                          src={client.logoUrl}
                          alt={client.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {client.projectCount} project
                          {client.projectCount !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => {
                        setClientToDelete(client.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.contactName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {client.contactName}
                    </div>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {client.contactEmail}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/clients/${client.id}`}>
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/clients/${client.id}/projects`}>
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Projects
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No clients yet
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Create your first client organization to start grouping projects
                and inviting client users to their dedicated portal.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Client
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client organization. You can assign projects and invite
              users to this client later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., City of Forney"
                value={newClient.name}
                onChange={(e) =>
                  setNewClient({ ...newClient, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                placeholder="Primary contact person"
                value={newClient.contactName}
                onChange={(e) =>
                  setNewClient({ ...newClient, contactName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@example.com"
                value={newClient.contactEmail}
                onChange={(e) =>
                  setNewClient({ ...newClient, contactEmail: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={newClient.phone}
                onChange={(e) =>
                  setNewClient({ ...newClient, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Client address"
                value={newClient.address}
                onChange={(e) =>
                  setNewClient({ ...newClient, address: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This will remove all
              client users and unassign all projects from this client. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
