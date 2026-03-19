import { AlertCircle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  title: string;
  description: string;
  currentLimit: number;
  nextTierName?: string;
  resourceType: "projects" | "media" | "teamMembers";
  variant?: "inline" | "card" | "banner";
}

export function UpgradePrompt({
  title,
  description,
  currentLimit,
  nextTierName = "Professional",
  resourceType,
  variant = "card",
}: UpgradePromptProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    navigate("/billing");
  };

  if (variant === "inline") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100">{title}</h4>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">{description}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
            onClick={handleUpgrade}
          >
            Upgrade to {nextTierName}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">{title}</h4>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleUpgrade}
            className="flex-shrink-0"
          >
            Upgrade
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-amber-900 dark:text-amber-100">{title}</CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200 mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleUpgrade}
          className="w-full sm:w-auto"
        >
          Upgrade to {nextTierName}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Dialog for showing limit reached message
 */
export function LimitReachedDialog({
  resourceType,
  currentLimit,
  nextTierName = "Professional",
  onClose,
}: {
  resourceType: string;
  currentLimit: number;
  nextTierName?: string;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();

  const messages: Record<string, { title: string; description: string }> = {
    projects: {
      title: "Project Limit Reached",
      description: `You've reached the limit of ${currentLimit} projects on your current plan. Upgrade to ${nextTierName} to create more projects.`,
    },
    media: {
      title: "Media File Limit Reached",
      description: `You've reached the limit of ${currentLimit} media files on your current plan. Upgrade to ${nextTierName} to upload more files.`,
    },
    teamMembers: {
      title: "Team Member Limit Reached",
      description: `You've reached the limit of ${currentLimit} team members on your current plan. Upgrade to ${nextTierName} to add more collaborators.`,
    },
  };

  const message = messages[resourceType] || messages.projects;

  const handleUpgrade = () => {
    onClose();
    navigate("/billing");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle>{message.title}</CardTitle>
              <CardDescription className="mt-2">{message.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUpgrade} className="flex-1">
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
