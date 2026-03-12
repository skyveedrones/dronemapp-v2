import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";


interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string | null;
  userEmail: string | null;
}

export function UserManagementDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
}: UserManagementDialogProps) {
  const [editName, setEditName] = useState(userName || "");
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");

  const [isSaving, setIsSaving] = useState(false);

  // Fetch user details
  const { data: userDetails, isLoading } = trpc.users.getUserDetails.useQuery(
    { userId },
    { enabled: open }
  );

  const utils = trpc.useUtils();

  // Update user mutation
  const updateUserMutation = trpc.users.updateUser.useMutation({
    onSuccess: () => {
      utils.users.getOwnerUsers.invalidate();
      utils.users.getUserDetails.invalidate({ userId });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update user", {
        description: error?.message || "Unknown error",
      });
    },
  });

  // Initialize form when user details load
  useEffect(() => {
    if (userDetails) {
      setEditName(userDetails.name || "");
      setSelectedRole(userDetails.role || "user");
    }
  }, [userDetails]);

  const handleSaveChanges = async () => {
    if (!editName.trim()) {
      toast.error("Please enter a user name");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserMutation.mutateAsync({
        userId,
        name: editName,
        role: selectedRole,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading User Details</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage User: {userName}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="details">User Details</TabsTrigger>
            </TabsList>

            {/* User Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user-name">Full Name</Label>
                  <Input
                    id="user-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter user name"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="user-email">Email Address</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userEmail || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email addresses cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="user-role">User Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as "user" | "admin")}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User - Can view and manage assigned projects</SelectItem>
                      <SelectItem value="admin">Admin - Full access to all features</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">Role Permissions:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>User:</strong> Can only access projects assigned to them</li>
                        <li><strong>Admin:</strong> Can access all projects and manage other users</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving || !editName.trim()}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </TabsContent>


          </Tabs>
        </DialogContent>
      </Dialog>


    </>
  );
}
