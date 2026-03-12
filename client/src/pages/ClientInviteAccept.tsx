/**
 * Client Invitation Acceptance Page
 * Shows client portal invitation details and allows users to accept after logging in
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Loader2,
  LogIn,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ClientInviteAccept() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const params = useParams<{ token: string }>();
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const token = params.token || "";

  // Fetch invitation details
  const { data: inviteData, isLoading, error } = trpc.clientPortal.getInvitationByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // Accept invitation mutation
  const utils = trpc.useUtils();
  const acceptMutation = trpc.clientPortal.acceptInvitation.useMutation({
    onSuccess: async () => {
      // Invalidate the portal data query to force a refetch
      await utils.clientPortal.getMyPortal.invalidate();
      setAccepted(true);
      toast.success("Invitation accepted!", {
        description: "You now have access to the client portal. Redirecting...",
      });
      // Redirect to portal after a short delay to show the toast
      setTimeout(() => {
        window.location.href = '/portal';
      }, 1500);
    },
    onError: (error) => {
      toast.error("Failed to accept invitation", {
        description: error.message,
      });
    },
  });

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
    sessionStorage.setItem("redirectAfterLogin", `/client-invite/${token}`);
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
              <img src={theme === "dark" ? "/images/skyvee-logo-white.png" : "/images/skyvee-logo-dark.png"} alt="SkyVee" className="h-8 w-auto" />
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

  const { invitation, client, inviter } = inviteData;

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
              <img src={theme === "dark" ? "/images/skyvee-logo-white.png" : "/images/skyvee-logo-dark.png"} alt="SkyVee" className="h-8 w-auto" />
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
                    You now have access to the "{client?.name}" client portal.
                  </p>
                  {accepted ? (
                    <p className="text-sm text-muted-foreground mb-4">Redirecting to portal...</p>
                  ) : (
                    <Link href="/portal">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Go to Client Portal
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
              <img src={theme === "dark" ? "/images/skyvee-logo-white.png" : "/images/skyvee-logo-dark.png"} alt="SkyVee" className="h-8 w-auto" />
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
                      ? "This invitation has expired. Please ask the administrator to send a new invitation."
                      : "This invitation has been revoked by the administrator."}
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
            <img src="/images/skyvee-logo-white.png" alt="SkyVee" className="h-8 w-auto" />
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
                  {inviter?.name || "Someone"} invited you to access a client portal
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Client Info */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    {client?.logoUrl ? (
                      <img
                        src={client.logoUrl}
                        alt={client.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{client?.name || "Client Portal"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Access to view assigned projects
                      </p>
                    </div>
                  </div>
                </div>

                {/* Access Level */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access Level</span>
                  <span className="font-medium capitalize">
                    {invitation.role === "admin" ? "Admin" : "Viewer"}
                  </span>
                </div>

                {/* Expiration */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
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
                    <p className="text-sm text-center text-muted-foreground">
                      Sign in to accept this invitation
                    </p>
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleLogin}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Accept
                    </Button>
                  </div>
                )}

                {/* Email mismatch warning */}
                {user && user.email?.toLowerCase() !== invitation.email.toLowerCase() && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-sm text-yellow-500">
                      <strong>Note:</strong> This invitation was sent to {invitation.email}. 
                      You're signed in as {user.email}. You can still accept, but make sure 
                      this is the correct account.
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
