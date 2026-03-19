/**
 * Account Page — User subscriber info, plan details, usage metrics, profile editing
 * Uses DashboardLayout for consistent navigation
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Crown,
  Mail,
  Shield,
  User as UserIcon,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  FolderOpen,
  Image,
  Users,
  HardDrive,
  Pencil,
  Save,
  X,
  Camera,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { PLAN_LIMITS, type SubscriptionTier } from "@shared/planLimits";

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/** Map tier to display name */
const TIER_DISPLAY: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  free: { label: "Free Trial", color: "bg-slate-600", icon: Clock },
  starter: { label: "Starter", color: "bg-blue-600", icon: CheckCircle2 },
  professional: { label: "Professional", color: "bg-emerald-600", icon: Crown },
  business: { label: "Business", color: "bg-amber-600", icon: Crown },
  enterprise: { label: "Enterprise", color: "bg-purple-600", icon: Shield },
};

/** Map subscription status to badge variant */
function getStatusBadge(status: string | null | undefined) {
  switch (status) {
    case "active":
      return { label: "Active", variant: "default" as const, icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-700" };
    case "trialing":
      return { label: "Trial", variant: "default" as const, icon: Clock, className: "bg-blue-600 hover:bg-blue-700" };
    case "past_due":
      return { label: "Past Due", variant: "destructive" as const, icon: AlertTriangle, className: "" };
    case "canceled":
      return { label: "Canceled", variant: "destructive" as const, icon: XCircle, className: "" };
    case "incomplete":
      return { label: "Incomplete", variant: "secondary" as const, icon: AlertTriangle, className: "" };
    default:
      return { label: "Free", variant: "secondary" as const, icon: Clock, className: "" };
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLimit(value: number): string {
  if (value >= 999999) return "Unlimited";
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

/** Usage progress bar component */
function UsageBar({
  icon: Icon,
  label,
  current,
  max,
  unit,
}: {
  icon: typeof FolderOpen;
  label: string;
  current: number;
  max: number;
  unit?: string;
}) {
  const isUnlimited = max >= 999999;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {unit ? `${current} ${unit}` : current} / {isUnlimited ? "∞" : `${formatLimit(max)}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full bg-emerald-500/20 rounded-full" />
        </div>
      )}
      {isAtLimit && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Limit reached — upgrade to continue
        </p>
      )}
    </div>
  );
}

export default function Account() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Usage stats
  const { data: usageStats, isLoading: usageLoading } = trpc.account.getUsageStats.useQuery();

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const updateProfile = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      utils.auth.me.invalidate();
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createPortal = trpc.payment.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.open(data.portalUrl, "_blank");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadLogo = trpc.logo.upload.useMutation({
    onSuccess: () => {
      toast.success("Profile photo updated");
      utils.auth.me.invalidate();
      utils.logo.get.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!user) return null;

  const tier = ((user as any).subscriptionTier || "free") as SubscriptionTier;
  const tierInfo = TIER_DISPLAY[tier] || TIER_DISPLAY.free;
  const TierIcon = tierInfo.icon;
  const statusInfo = getStatusBadge((user as any).subscriptionStatus);
  const StatusIcon = statusInfo.icon;

  const billingPeriod = (user as any).billingPeriod;
  const periodStart = (user as any).currentPeriodStart;
  const periodEnd = (user as any).currentPeriodEnd;
  const cancelAtEnd = (user as any).cancelAtPeriodEnd === "yes";
  const createdAt = (user as any).createdAt;
  const lastSignedIn = (user as any).lastSignedIn;
  const organization = (user as any).organization;
  const stripeCustomerId = (user as any).stripeCustomerId;
  const logoUrl = (user as any).logoUrl;

  const limits = PLAN_FEATURES[tier];

  const startEditing = () => {
    setEditName(user.name || "");
    setEditOrg(organization || "");
    setIsEditing(true);
  };

  const saveProfile = () => {
    updateProfile.mutate({
      name: editName || undefined,
      organization: editOrg || undefined,
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogo.mutate({
        fileData: base64,
        filename: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Back to Dashboard */}
        <motion.div variants={fadeInUp}>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Page Header */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Account
            </h1>
            <p className="text-muted-foreground text-sm">
              View your account information, subscription details, and billing status.
            </p>
          </div>
          <Link href="/pricing">
            <Button variant="outline" className="gap-2">
              <Crown className="h-4 w-4" />
              {tier === "free" ? "Upgrade Plan" : "Change Plan"}
            </Button>
          </Link>
        </motion.div>

        {/* Plan Overview Card */}
        <motion.div variants={fadeInUp}>
          <Card className="border-primary/20 overflow-hidden">
            <div className={`h-1.5 ${tierInfo.color}`} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TierIcon className="h-5 w-5 text-primary" />
                  Subscription Plan
                </CardTitle>
                <Badge className={statusInfo.className} variant={statusInfo.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-xl ${tierInfo.color} flex items-center justify-center`}>
                  <TierIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {tierInfo.label}
                  </h3>
                  {billingPeriod && (
                    <p className="text-sm text-muted-foreground capitalize">
                      {billingPeriod} billing
                    </p>
                  )}
                </div>
              </div>

              {cancelAtEnd && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    Your subscription will cancel at the end of the current billing period.
                  </p>
                </div>
              )}

              {(periodStart || periodEnd) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Period Start</p>
                      <p className="text-sm font-medium">{formatShortDate(periodStart)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Period End</p>
                      <p className="text-sm font-medium">{formatShortDate(periodEnd)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Metrics */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Usage &amp; Limits
                </CardTitle>
                <Badge variant="outline" className="text-xs capitalize">
                  {tierInfo.label} Plan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your current resource usage against your plan limits. Upgrade your plan to increase limits.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading usage data...</span>
                </div>
              ) : usageStats ? (
                <>
                  <UsageBar
                    icon={FolderOpen}
                    label="Projects"
                    current={usageStats.projectCount}
                    max={limits.maxProjects}
                  />
                  <UsageBar
                    icon={Image}
                    label="Media Files"
                    current={usageStats.totalMedia}
                    max={limits.maxMediaFiles}
                  />
                  <UsageBar
                    icon={Users}
                    label="Team Members"
                    current={usageStats.teamMemberCount}
                    max={limits.maxTeamMembers}
                  />
                  <UsageBar
                    icon={HardDrive}
                    label="Storage"
                    current={usageStats.estimatedStorageGB}
                    max={limits.maxStorageGB}
                    unit="GB"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Unable to load usage data.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Information — Editable */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" />
                  Account Information
                </CardTitle>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setIsEditing(false)}
                      disabled={updateProfile.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={saveProfile}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Profile Photo */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl border-2 border-border">
                      {(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    disabled={uploadLogo.isPending}
                  >
                    {uploadLogo.isPending ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">Hover over photo to change</p>
                </div>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Full Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Email Address
                    </Label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user.email || "—"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-org" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Organization
                    </Label>
                    <Input
                      id="edit-org"
                      value={editOrg}
                      onChange={(e) => setEditOrg(e.target.value)}
                      placeholder="Your organization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Account Role
                    </Label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline" className="capitalize text-xs">
                        {user.role || "user"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-sm font-medium">{user.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email Address</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">{user.email || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Organization</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">{organization || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Role</p>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline" className="capitalize text-xs">
                        {user.role || "user"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity & Dates */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Created</p>
                  <p className="text-sm font-medium">{formatDate(createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Sign In</p>
                  <p className="text-sm font-medium">{formatDate(lastSignedIn)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Billing */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Customer ID</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {stripeCustomerId || "Not connected"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Period</p>
                  <p className="text-sm font-medium capitalize">{billingPeriod || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                {stripeCustomerId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => createPortal.mutate()}
                    disabled={createPortal.isPending}
                  >
                    {createPortal.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5" />
                    )}
                    Manage Subscription
                  </Button>
                ) : (
                  <Link href="/pricing">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Crown className="h-3.5 w-3.5" />
                      Upgrade Plan
                    </Button>
                  </Link>
                )}
                <Link href="/billing">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Payment History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help text */}
        <motion.div variants={fadeInUp}>
          <p className="text-xs text-muted-foreground text-center pb-6">
            Need help with your account? Contact support at{" "}
            <a href="mailto:support@skyveedrones.com" className="text-primary hover:underline">
              support@skyveedrones.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
