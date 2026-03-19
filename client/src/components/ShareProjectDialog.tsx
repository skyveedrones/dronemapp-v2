/**
 * Share Project Dialog
 * Allows project owners to invite collaborators via email
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  Send,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";

interface ShareProjectDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to generate project invite email template
function generateProjectInviteEmailTemplate(invite: { inviteUrl: string; email: string; role: string; projectName: string; inviterName: string }) {
  const roleDescription = invite.role === 'editor' 
    ? 'view, upload media, and edit project details'
    : 'view the project, media gallery, and interactive maps';
  
  return `Subject: You've been invited to collaborate on "${invite.projectName}" - MapIt

Hi,

${invite.inviterName} has invited you to collaborate on the project "${invite.projectName}" on MapIt.

As a ${invite.role}, you'll be able to ${roleDescription}.

To accept this invitation:

1. Click the link below (or copy and paste it into your browser):
   ${invite.inviteUrl}

2. Sign in with your email address (${invite.email})

3. Start collaborating on the project

What you can do:
• View interactive maps with drone footage
• Browse GPS-tagged photos and videos
• Download media files and GPS data
• Generate PDF reports
• Export data in multiple formats (KML, CSV, GeoJSON, GPX)
${invite.role === 'editor' ? '• Upload new media and manage project details' : ''}

This invitation link will expire in 7 days. If you have any questions, please contact ${invite.inviterName}.

Best regards,
The MapIt Team

---
This is an automated message from MapIt. Please do not reply to this email.`;
}

export function ShareProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [inviteMethod, setInviteMethod] = useState<"email" | "copy">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<{ inviteUrl: string; email: string; role: string; projectName: string; inviterName: string } | null>(null);

  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Fetch collaborators
  const { data: collaborators, isLoading: loadingCollaborators } =
    trpc.sharing.getCollaborators.useQuery(
      { projectId },
      { enabled: open }
    );

  // Fetch invitations
  const { data: invitations, isLoading: loadingInvitations } =
    trpc.sharing.getInvitations.useQuery(
      { projectId },
      { enabled: open }
    );

  // Invite mutation
  const inviteMutation = trpc.sharing.invite.useMutation({
    onSuccess: (data) => {
      // Store the result for copy functionality
      if (data.inviteUrl && user) {
        setLastInviteResult({
          inviteUrl: data.inviteUrl,
          email: email,
          role: role,
          projectName: projectName,
          inviterName: user.name || 'A MapIt user',
        });
      }
      
      if (inviteMethod === "copy") {
        toast.success("Invitation link generated", {
          description: "Copy the link and email template below to send manually.",
          duration: 5000,
        });
      } else if (data.emailSent) {
        toast.success("Invitation sent!", {
          description: "You can also copy the link and email template below.",
          duration: 5000,
        });
      } else if (data.isNew) {
        toast.success("Invitation created", {
          description: "Email could not be sent. Use the copy button below to share manually.",
          duration: 5000,
        });
      } else {
        toast.info("Invitation already exists", {
          description: "A pending invitation already exists for this email address.",
        });
      }
      setEmail("");
      utils.sharing.getInvitations.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to send invitation", {
        description: error.message,
      });
    },
  });

  // Revoke invitation mutation
  const revokeMutation = trpc.sharing.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.sharing.getInvitations.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to revoke invitation", {
        description: error.message,
      });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = trpc.sharing.removeCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Collaborator removed");
      utils.sharing.getCollaborators.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to remove collaborator", {
        description: error.message,
      });
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await inviteMutation.mutateAsync({
        projectId,
        email: email.trim().toLowerCase(),
        role,
        sendEmail: inviteMethod === "email", // Only send email if email method is selected
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = (invitationId: number) => {
    revokeMutation.mutate({ invitationId });
  };

  const handleRemoveCollaborator = (userId: number) => {
    removeCollaboratorMutation.mutate({ projectId, userId });
  };

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || [];
  const pastInvitations = invitations?.filter((inv) => inv.status !== "pending") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Invite team members to collaborate on "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="members">
              Members ({(collaborators?.length || 0) + pendingInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-3">
                <Label>Invitation Method</Label>
                <RadioGroup value={inviteMethod} onValueChange={(v) => setInviteMethod(v as "email" | "copy")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="share-method-email" />
                    <Label htmlFor="share-method-email" className="font-normal cursor-pointer">
                      Send via MapIt Email - Automated email delivery
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="copy" id="share-method-copy" />
                    <Label htmlFor="share-method-copy" className="font-normal cursor-pointer">
                      Copy Link Only - I'll send manually
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Access Level</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          Can view project, media, and maps
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col items-start">
                        <span>Editor</span>
                        <span className="text-xs text-muted-foreground">
                          Can view, upload media, and edit
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!email.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {inviteMethod === "copy" ? "Generating Link..." : "Sending Invitation..."}
                  </>
                ) : inviteMethod === "copy" ? (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Generate Invitation Link
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>

            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">How invitations work:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Invited users will receive an email with a link</li>
                <li>They must create an account or sign in to accept</li>
                <li>Invitations expire after 7 days</li>
              </ul>
            </div>

            {/* Copy Invitation Link & Template - Only show when copy method was used */}
            {lastInviteResult && inviteMethod === "copy" && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Copy Invitation Link & Template</p>
                <p className="text-xs text-muted-foreground">
                  Use this when email servers block automated emails. Copy the link and email template to send manually.
                </p>
                
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
                    value={generateProjectInviteEmailTemplate(lastInviteResult)}
                    readOnly
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(generateProjectInviteEmailTemplate(lastInviteResult));
                      toast.success("Email template copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email Template
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <div className="space-y-4">
              {/* Current Collaborators */}
              {loadingCollaborators ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : collaborators && collaborators.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Active Collaborators
                  </h4>
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(collab.userName || collab.userEmail || "U")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {collab.userName || collab.userEmail}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {collab.role === "editor" ? "Editor" : "Viewer"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveCollaborator(collab.userId)}
                        disabled={removeCollaboratorMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Pending Invitations */}
              {loadingInvitations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pendingInvitations.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Pending Invitations
                  </h4>
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-card/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.role === "editor" ? "Editor" : "Viewer"} • Expires{" "}
                            {format(new Date(inv.expiresAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevokeInvitation(inv.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Empty State */}
              {!loadingCollaborators &&
                !loadingInvitations &&
                (!collaborators || collaborators.length === 0) &&
                pendingInvitations.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No collaborators yet. Send an invitation to get started.
                    </p>
                  </div>
                )}

              {/* Past Invitations (collapsed by default) */}
              {pastInvitations.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    Past invitations ({pastInvitations.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {pastInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {inv.status === "accepted" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : inv.status === "expired" ? (
                            <Clock className="h-4 w-4 text-gray-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-muted-foreground">{inv.email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
