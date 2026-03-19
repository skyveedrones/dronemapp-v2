/**
 * Users Management Page
 * Allows the project owner to:
 * - View all users who have access to their projects
 * - Manage user roles and permissions
 * - Assign/unassign projects to users
 * - Remove users from projects
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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Edit2,
  Loader2,
  Mail,
  Plus,
  Trash2,
  User,
  Users,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { UserManagementDialog } from "@/components/UserManagementDialog";

export default function UsersPage() {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string | null; email: string | null } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Fetch all users who have access to owner's projects
  const { data: users, isLoading, refetch } = trpc.users.getOwnerUsers.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();

  // Invite user mutation
  const inviteUserMutation = trpc.users.inviteUserToProjects.useMutation({
    onSuccess: () => {
      utils.users.getOwnerUsers.invalidate();
      setInviteEmail("");
      setInviteDialogOpen(false);
      toast.success("Invitation sent successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to send invitation", {
        description: error?.message || "Unknown error",
      });
    },
  });

  // Remove user mutation
  const removeUserMutation = trpc.users.removeUserFromProjects.useMutation({
    onSuccess: () => {
      utils.users.getOwnerUsers.invalidate();
      toast.success("User removed successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to remove user", {
        description: error?.message || "Unknown error",
      });
    },
  });

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      await inviteUserMutation.mutateAsync({ email: inviteEmail });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = (userId: number) => {
    if (confirm("Are you sure you want to remove this user from all your projects?")) {
      removeUserMutation.mutate({ userId });
    }
  };

  const handleManageUser = (userItem: { id: number; name: string | null; email: string | null }) => {
    setSelectedUser(userItem);
    setManageDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Users</h1>
              <p className="text-muted-foreground mt-2">Manage user access to your projects</p>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
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
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-2">
              Manage user access and assign projects to your team members
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        {/* Help Section */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How to manage users:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Click "Invite User" to send an invitation to a new user</li>
                  <li>Use "Manage Projects" to assign or unassign projects to users</li>
                  <li>Users will only see projects that are assigned to them</li>
                  <li>Remove users to revoke all their project access</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {users && users.length > 0 ? (
          <div className="grid gap-4">
            {users.map((userItem: any) => (
              <Card key={userItem.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">
                          {userItem.name || "Unnamed User"}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {userItem.email || "No email"}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {userItem.projectCount} project{userItem.projectCount !== 1 ? "s" : ""} assigned
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageUser(userItem)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUser(userItem.id)}
                        disabled={removeUserMutation.isPending}
                      >
                        {removeUserMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Users Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Invite users to your projects to collaborate and share access to your drone mapping data.
              </p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Your First User
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to a user to access your projects. They'll receive an email with instructions to set up their account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isInviting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      {selectedUser && (
        <UserManagementDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
        />
      )}


    </DashboardLayout>
  );
}
