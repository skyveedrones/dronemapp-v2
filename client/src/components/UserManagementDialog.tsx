import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertCircle, X, Plus, FolderOpen, Key, Eye, EyeOff } from "lucide-react";


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
  const [selectedRole, setSelectedRole] = useState<"user" | "admin" | "webmaster" | "client">("user");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Fetch user details
  const { data: userDetails, isLoading } = trpc.users.getUserDetails.useQuery(
    { userId },
    { enabled: open }
  );

  // Fetch available projects for assignment
  const { data: availableProjects } = trpc.users.getAvailableProjects.useQuery(
    undefined,
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

  // Set password mutation
  const setPasswordMutation = trpc.users.setPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast.error("Failed to set password", {
        description: error?.message || "Unknown error",
      });
    },
  });

  // Assign project mutation
  const assignProjectMutation = trpc.users.assignProject.useMutation({
    onSuccess: (result) => {
      utils.users.getUserDetails.invalidate({ userId });
      utils.users.getOwnerUsers.invalidate();
      if (result.alreadyAssigned) {
        toast.info("User is already assigned to this project");
      } else {
        toast.success("Project assigned successfully");
      }
      setSelectedProjectId("");
    },
    onError: (error: any) => {
      toast.error("Failed to assign project", {
        description: error?.message || "Unknown error",
      });
    },
  });

  // Unassign project mutation
  const unassignProjectMutation = trpc.users.unassignProject.useMutation({
    onSuccess: () => {
      utils.users.getUserDetails.invalidate({ userId });
      utils.users.getOwnerUsers.invalidate();
      toast.success("Project removed from user");
    },
    onError: (error: any) => {
      toast.error("Failed to remove project", {
        description: error?.message || "Unknown error",
      });
    },
  });

  // Initialize form when user details load
  useEffect(() => {
    if (userDetails) {
      setEditName(userDetails.name || "");
      setSelectedRole(userDetails.role || "user");
      setCompanyName(userDetails.companyName || "");
      setDepartment(userDetails.department || "");
      setPhone(userDetails.phone || "");
    }
  }, [userDetails]);

  // Filter out already-assigned projects
  const unassignedProjects = useMemo(() => {
    if (!availableProjects || !userDetails?.assignedProjects) return availableProjects || [];
    const assignedIds = new Set(userDetails.assignedProjects.map((p: any) => p.projectId));
    return availableProjects.filter((p: any) => !assignedIds.has(p.id));
  }, [availableProjects, userDetails?.assignedProjects]);

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
        companyName: companyName || null,
        department: department || null,
        phone: phone || null,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword) {
      toast.error("Please enter a password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSettingPassword(true);
    try {
      await setPasswordMutation.mutateAsync({
        userId,
        password: newPassword,
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleAssignProject = () => {
    if (!selectedProjectId) return;
    assignProjectMutation.mutate({
      userId,
      projectId: parseInt(selectedProjectId),
    });
  };

  const handleUnassignProject = (projectId: number) => {
    unassignProjectMutation.mutate({ userId, projectId });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading User Details</DialogTitle>
            <DialogDescription>Fetching user information...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User: {userName}</DialogTitle>
          <DialogDescription>
            Update user details, manage project access, or set a password.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          {/* User Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-company">Company Name</Label>
                  <Input
                    id="user-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="user-department">Department</Label>
                  <Input
                    id="user-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Enter department"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-phone">Phone Number</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <Label htmlFor="user-role">User Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as "user" | "admin" | "webmaster" | "client")}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="webmaster">Webmaster</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Role Info */}
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                    <p><strong>User:</strong> Can only access assigned projects</p>
                    <p><strong>Admin:</strong> Full access to all projects and user management</p>
                    <p><strong>Webmaster:</strong> Full access to all projects and user management</p>
                    <p><strong>Client:</strong> Restricted to client portal view only</p>
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

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Assign or remove projects for this user. Users can only see projects assigned to them.
            </div>

            {/* Assigned Projects */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned Projects</Label>
              {userDetails?.assignedProjects && userDetails.assignedProjects.length > 0 ? (
                <div className="space-y-2">
                  {userDetails.assignedProjects.map((project: any) => (
                    <div
                      key={project.projectId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{project.projectName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {project.role}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassignProject(project.projectId)}
                        disabled={unassignProjectMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  No projects assigned yet
                </div>
              )}
            </div>

            {/* Add Project */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Project</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a project to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedProjects && unassignedProjects.length > 0 ? (
                      unassignedProjects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        No available projects
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignProject}
                  disabled={!selectedProjectId || assignProjectMutation.isPending}
                  size="sm"
                >
                  {assignProjectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Set or update the password for this user. This allows them to log in with email and password.
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={isSettingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isSettingPassword}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <Key className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-100">
                    <p>Setting a password allows this user to log in with their email and password. The password is securely hashed and stored.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isSettingPassword}
              >
                Clear
              </Button>
              <Button
                onClick={handleSetPassword}
                disabled={isSettingPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Password
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
