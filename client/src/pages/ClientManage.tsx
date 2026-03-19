/**
 * Client Management Page
 * Full management interface for a single client:
 * - Logo upload/change
 * - Edit client details
 * - Invite users
 * - View/manage users
 * - Delete client
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Building2,
  Camera,
  Copy,
  FolderOpen,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { ProjectAssignmentDialog } from "@/components/ProjectAssignmentDialog";

// Helper function to generate client invite email template
function generateClientInviteEmailTemplate(invite: { inviteUrl: string; email: string; role: string; clientName: string }) {
  const roleDescription = invite.role === 'admin' 
    ? 'manage the client portal and view all projects'
    : invite.role === 'user'
    ? 'view, download, upload, and create flights for projects'
    : 'view all projects assigned to this client';
  
  return `Subject: You've been invited to ${invite.clientName}'s MapIt Portal

Hi,

You've been invited to access ${invite.clientName}'s project portal on MapIt.

As a ${invite.role}, you'll be able to ${roleDescription}.

To accept this invitation and set up your access:

1. Click the link below (or copy and paste it into your browser):
   ${invite.inviteUrl}

2. Sign in with your email address (${invite.email})

3. Start viewing projects and media

What you can do:
• View interactive maps with drone footage
• Browse media galleries with GPS-tagged photos and videos
• Download media files and GPS data
• Generate PDF reports
• Export data in multiple formats (KML, CSV, GeoJSON, GPX)

This invitation link will expire in 7 days. If you have any questions, please contact the person who invited you.

Best regards,
The MapIt Team

---
This is an automated message from MapIt. Please do not reply to this email.`;
}

export default function ClientManage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: number; name: string | null } | null>(null);
  const [lastInviteResult, setLastInviteResult] = useState<{ inviteUrl: string; email: string; role: string; clientName: string } | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string | null } | null>(null);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<{ id: number; name: string | null; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState<"viewer" | "user" | "admin">("viewer");
    
  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "user" | "admin">("viewer");
  const [inviteMethod, setInviteMethod] = useState<"email" | "copy">("email");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    address: "",
  });
  
  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Fetch client data
  const {
    data: client,
    isLoading: clientLoading,
    refetch: refetchClient,
  } = trpc.clientPortal.get.useQuery(
    { id: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  // Fetch client users
  const {
    data: clientUsers,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = trpc.clientPortal.getUsers.useQuery(
    { clientId: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  // Fetch pending invitations
  const {
    data: pendingInvitations,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = trpc.clientPortal.getPendingInvitations.useQuery(
    { clientId: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  // Mutations
  const updateClientMutation = trpc.clientPortal.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated successfully");
      setIsEditing(false);
      refetchClient();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update client");
    },
  });

  const deleteClientMutation = trpc.clientPortal.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      setLocation("/clients");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  const uploadLogoMutation = trpc.clientPortal.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo uploaded successfully");
      setIsUploadingLogo(false);
      refetchClient();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload logo");
      setIsUploadingLogo(false);
    },
  });

  const deleteLogoMutation = trpc.clientPortal.deleteLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo removed");
      refetchClient();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove logo");
    },
  });

  const inviteMutation = trpc.clientPortal.invite.useMutation({
    onSuccess: (result) => {
      // Store the result for copy functionality
      if (client) {
        setLastInviteResult({
          inviteUrl: result.inviteUrl,
          email: inviteEmail,
          role: inviteRole,
          clientName: client.name,
        });
      }
      
      if (inviteMethod === "copy") {
        toast.success("Invitation link generated", {
          description: "Copy the link and email template below to send manually.",
          duration: 5000,
        });
      } else if (result.emailSent) {
        toast.success("Invitation sent successfully", {
          description: "You can also copy the link and email template below.",
          duration: 5000,
        });
      } else {
        toast.success("Invitation created", {
          description: "Email could not be sent. Use the copy button below to share manually.",
          duration: 5000,
        });
      }
      // Don't close dialog automatically - let user copy invitation first
      // setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const removeUserMutation = trpc.clientPortal.removeUser.useMutation({
    onSuccess: () => {
      toast.success("User removed from client");
      setRemoveUserDialogOpen(false);
      setUserToRemove(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove user");
    },
  });


  const changeUserRoleMutation = trpc.clientPortal.changeUserRole.useMutation({
    onSuccess: (data) => {
      toast.success("User role updated successfully");
      setChangeRoleDialogOpen(false);
      setUserToChangeRole(null);
      setNewRole("viewer");
      refetchUsers();
      
      // Invalidate all relevant caches to ensure role changes are reflected sitewide
      const utils = trpc.useUtils();
      
      // Invalidate the changed users data
      utils.clientPortal.getUserAccess.invalidate();
      utils.clientPortal.getUsers.invalidate();
      utils.project.list.invalidate();
      utils.project.get.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

    const revokeInvitationMutation = trpc.clientPortal.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke invitation");
    },
  });

  // Handlers
  const handleStartEdit = useCallback(() => {
    if (client) {
      setEditForm({
        name: client.name,
        contactName: client.contactName || "",
        contactEmail: client.contactEmail || "",
        phone: client.phone || "",
        address: client.address || "",
      });
      setIsEditing(true);
    }
  }, [client]);

  const handleSaveEdit = () => {
    if (!client) return;
    updateClientMutation.mutate({
      id: client.id,
      name: editForm.name,
      contactName: editForm.contactName || null,
      contactEmail: editForm.contactEmail || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogoMutation.mutate({
        clientId: client.id,
        fileData: base64,
        filename: file.name,
        mimeType: file.type,
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = () => {
    if (!client) return;
    deleteLogoMutation.mutate({ clientId: client.id });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (!client) return;
    
    // If copy-only mode, create invite without sending email
    if (inviteMethod === "copy") {
      inviteMutation.mutate({
        clientId: client.id,
        email: inviteEmail.trim(),
        role: inviteRole,
        sendEmail: false, // Don't send automated email
      });
    } else {
      // Send via email
      inviteMutation.mutate({
        clientId: client.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
    }
  };

  const handleRemoveUser = () => {
    if (!userToRemove || !client) return;
    removeUserMutation.mutate({
      clientId: client.id,
      userId: userToRemove.id,
    });
  };

  const handleDeleteClient = () => {
    if (!client) return;
    deleteClientMutation.mutate({ id: client.id });
  };

  if (authLoading || clientLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <p className="text-muted-foreground mb-4">
            The client you're looking for doesn't exist or you don't have access.
          </p>
          <Button asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-muted-foreground">Manage client settings and users</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/clients/${client.id}/projects`}>
              <FolderOpen className="h-4 w-4 mr-2" />
              View Projects
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Client Logo
              </CardTitle>
              <CardDescription>
                Upload a logo to display on client cards and portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="relative">
                  {client.logoUrl ? (
                    <div className="relative group">
                      <img
                        src={client.logoUrl}
                        alt={client.name}
                        className="h-24 w-24 rounded-lg object-cover border"
                      />
                      <button
                        onClick={handleDeleteLogo}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deleteLogoMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    variant="outline"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {client.logoUrl ? "Change Logo" : "Upload Logo"}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG up to 5MB. Square images work best.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Details Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Client Details
                  </CardTitle>
                  <CardDescription>
                    Contact information and address
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name *</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={editForm.contactName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contactName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contactEmail: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={updateClientMutation.isPending || !editForm.name.trim()}
                    >
                      {updateClientMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={updateClientMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {client.contactName}
                    </div>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {client.contactEmail}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {client.address}
                    </div>
                  )}
                  {!client.contactName && !client.contactEmail && !client.phone && !client.address && (
                    <p className="text-sm text-muted-foreground">
                      No contact information added yet.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Portal Users
                  </CardTitle>
                  <CardDescription>
                    Users who can access this client's portal
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : clientUsers && clientUsers.length > 0 ? (
                <div className="space-y-2">
                  {clientUsers.map(({ clientUser, user: clientUserData }) => (
                    <div
                      key={clientUser.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {clientUserData.name || clientUserData.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {clientUser.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToChangeRole({
                              id: clientUserData.id,
                              name: clientUserData.name,
                              currentRole: clientUser.role,
                            });
                            setNewRole(clientUser.role as "viewer" | "user" | "admin");
                            setChangeRoleDialogOpen(true);
                          }}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Change Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser({
                              id: clientUserData.id,
                              name: clientUserData.name,
                            });
                            setAssignmentDialogOpen(true);
                          }}
                        >
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Manage Projects
                        </Button>
                        {(user?.role === 'admin' || user?.role === 'webmaster') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setUserToRemove({
                              id: clientUserData.id,
                              name: clientUserData.name,
                            });
                            setRemoveUserDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users have access yet. Invite users to give them portal access.
                </p>
              )}

              {/* Pending Invitations */}
              {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Pending Invitations</p>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-yellow-500" />
                          </div>
                          <div>
                            <p className="text-sm">{invitation.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Expires{" "}
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            revokeInvitationMutation.mutate({
                              invitationId: invitation.id,
                            })
                          }
                          disabled={revokeInvitationMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copy Invitation Link & Template */}
          {lastInviteResult && (
            <Card>
              <CardHeader>
                <CardTitle>Copy Invitation Link & Template</CardTitle>
                <CardDescription>
                  Use this when email servers block automated emails. Copy the link and email template to send manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invitation Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={lastInviteResult.inviteUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(lastInviteResult.inviteUrl);
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <Textarea
                    value={generateClientInviteEmailTemplate(lastInviteResult)}
                    readOnly
                    className="font-mono text-sm min-h-[300px]"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(generateClientInviteEmailTemplate(lastInviteResult));
                      toast.success("Email template copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone - Webmaster only */}
          {user?.role === 'webmaster' && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete this client</p>
                    <p className="text-sm text-muted-foreground">
                      Remove the client and all user access. Projects will be unassigned.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
        setInviteDialogOpen(open);
        if (!open) {
          // Clear last invite result when dialog is closed
          setLastInviteResult(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User to Portal</DialogTitle>
            <DialogDescription>
              Send an invitation email to give someone access to {client.name}'s
              portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Invitation Method</Label>
              <RadioGroup value={inviteMethod} onValueChange={(v) => setInviteMethod(v as "email" | "copy")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="method-email" />
                  <Label htmlFor="method-email" className="font-normal cursor-pointer">
                    Send via MapIt Email - Automated email delivery
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copy" id="method-copy" />
                  <Label htmlFor="method-copy" className="font-normal cursor-pointer">
                    Copy Link Only - I'll send manually
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "viewer" | "user" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Can view projects</SelectItem>
                  <SelectItem value="user">User - Can view, download, upload, and create flights</SelectItem>
                  <SelectItem value="admin">Admin - Can manage client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Copy Invitation Section - Only show when copy method was used */}
            {lastInviteResult && inviteMethod === "copy" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">📋 Copy Invitation (Manual Email Option)</Label>
                  <p className="text-sm text-muted-foreground">
                    Use this if the automated email is blocked by the recipient's email server.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Invitation Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={lastInviteResult.inviteUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(lastInviteResult.inviteUrl);
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Email Template</Label>
                  <Textarea
                    value={generateClientInviteEmailTemplate(lastInviteResult)}
                    readOnly
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(generateClientInviteEmailTemplate(lastInviteResult));
                      toast.success("Email template copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email Template
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : inviteMethod === "copy" ? (
                <Copy className="h-4 w-4 mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {inviteMethod === "copy" ? "Generate Invitation Link" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={removeUserDialogOpen} onOpenChange={setRemoveUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{userToRemove?.name || "this user"}</strong> from{" "}
              {client.name}? They will no longer have access to the client portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveUserDialogOpen(false)}
              disabled={removeUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{client.name}</strong>? This
              action cannot be undone. All user access will be removed and projects
              will be unassigned from this client.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Assignment Dialog */}
      {selectedUser && client && (
        <ProjectAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          clientId={parseInt(clientId || "0")}
          userId={selectedUser.id}
          userName={selectedUser.name || "User"}
        />
      )}
      {/* Change User Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {userToChangeRole?.name || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Role</Label>
              <p className="text-sm text-muted-foreground capitalize">
                {userToChangeRole?.currentRole}
              </p>
            </div>
            <div>
              <Label htmlFor="role-select">New Role</Label>
              <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - View projects only</SelectItem>
                  <SelectItem value="user">User - View, download, upload media</SelectItem>
                  <SelectItem value="admin">Admin - Full portal management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!userToChangeRole || !client) return;
                changeUserRoleMutation.mutate({
                  clientId: client.id,
                  userId: userToChangeRole.id,
                  newRole,
                });
              }}
              disabled={changeUserRoleMutation.isPending}
            >
              {changeUserRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    
    </DashboardLayout>
  );
}
