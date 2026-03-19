import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount?: number;
  limit?: number;
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentCount,
  limit,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Project Limit Reached</DialogTitle>
          </div>
          <DialogDescription>
            You have reached your project limit{limit ? ` of ${limit}` : ""}
            {currentCount && limit ? ` (${currentCount}/${limit} projects)` : ""}.
            Upgrade your plan to create more projects.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Upgrading to a higher tier will allow you to create and manage more
              drone mapping projects.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button asChild>
            <Link href="/billing">View Plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
