/**
 * Invitation Acceptance Page
 * Shows invitation details and allows users to accept after logging in
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  FolderOpen,
  Loader2,
  LogIn,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function InviteAccept() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedProjectId, setAcceptedProjectId] = useState<number | null>(null);

  const token = params.token || "";

  // Fetch invitation details
  const { data: inviteData, isLoading, error } = trpc.sharing.getInvitationByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // Accept invitation mutation
  const acceptMutation = trpc.sharing.acceptInvitation.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      setAcceptedProjectId(data.project?.id || null);
      toast.success("Invitation accepted!", {
        description: "You now have access to this project.",
      });
    },
    onError: (error) => {
      toast.error("Failed to accept invitation", {
        description: error.message,
      });
    },
  });

  // Auto-accept if user is logged in and invitation is valid
  useEffect(() => {
    if (
      user &&
      inviteData?.invitation?.status === "pending" &&
      !accepted &&
      !isAccepting &&
      !acceptMutation.isPending
    ) {
      // Auto-accept the invitation after user logs in
      setIsAccepting(true);
      acceptMutation.mutate({ token });
    }
  }, [user, inviteData, accepted, isAccepting, acceptMutation, token]);

  const handleAccept = async () => {
    if (!user || !token) return;
    
    setIsAccepting(true);
    try {
      await acceptMutation.mutateAsync({ token });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem("redirectAfterLogin", `/invite/${token}`);
    window.location.href = getLoginUrl();
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid or not found
  if (!inviteData || !inviteData.invitation) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
            </Link>
          </div>
        </nav>

        <main className="pt-24 pb-12">
          <div className="container max-w-lg">
            <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
              <Card className="border-destructive/50">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
                  <p className="text-muted-foreground mb-6">
                    This invitation link is invalid or has been removed.
                  </p>
                  <Link href="/">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Go to Homepage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const { invitation, project, inviter } = inviteData;

  // Check invitation status
  const isExpired = invitation.status === "expired" || new Date(invitation.expiresAt) < new Date();
  const isAlreadyAccepted = invitation.status === "accepted";
  const isRevoked = invitation.status === "revoked";
  const isPending = invitation.status === "pending" && !isExpired;

  // Already accepted - show success and redirect option
  if (accepted || isAlreadyAccepted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
            </Link>
          </div>
        </nav>

        <main className="pt-24 pb-12">
          <div className="container max-w-lg">
            <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
              <Card className="border-primary/50">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {accepted ? "Invitation Accepted!" : "Already Accepted"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    You now have access to "{project?.name || "this project"}".
                  </p>
                  {(acceptedProjectId || project?.id) && (
                    <Link href={`/project/${acceptedProjectId || project?.id}`}>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        View Project
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Expired or revoked
  if (isExpired || isRevoked) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
            </Link>
          </div>
        </nav>

        <main className="pt-24 pb-12">
          <div className="container max-w-lg">
            <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
              <Card className="border-yellow-500/50">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                    {isExpired ? (
                      <Clock className="h-8 w-8 text-yellow-500" />
                    ) : (
                      <X className="h-8 w-8 text-yellow-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {isExpired ? "Invitation Expired" : "Invitation Revoked"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {isExpired
                      ? "This invitation has expired. Please ask the project owner to send a new invitation."
                      : "This invitation has been revoked by the project owner."}
                  </p>
                  <Link href="/">
                    <Button variant="outline">Go to Homepage</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Valid pending invitation
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-8 w-auto" />
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-12">
        <div className="container max-w-lg">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">You've Been Invited!</CardTitle>
                <CardDescription>
                  {inviter?.name || "Someone"} invited you to collaborate on a drone mapping project
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Project Info */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{project?.name || "Project"}</h3>
                      {project?.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Access Level */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access Level</span>
                  <span className="font-medium">
                    {invitation.role === "editor" ? "Editor" : "Viewer"}
                  </span>
                </div>

                {/* Invited Email */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Invited Email</span>
                  <span className="font-medium">{invitation.email}</span>
                </div>

                {/* Action Button */}
                {user ? (
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleAccept}
                    disabled={isAccepting || acceptMutation.isPending}
                  >
                    {isAccepting || acceptMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleLogin}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Accept
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      You need to sign in or create an account to accept this invitation
                    </p>
                  </div>
                )}

                {/* Email mismatch warning */}
                {user && user.email && invitation.email.toLowerCase() !== user.email.toLowerCase() && (
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                    <p className="text-yellow-600 dark:text-yellow-400">
                      <strong>Note:</strong> This invitation was sent to {invitation.email}, but you're signed in as {user.email}. You can still accept it with your current account.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
