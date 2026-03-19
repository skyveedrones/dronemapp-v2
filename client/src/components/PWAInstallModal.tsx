import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share2, Plus, Home, ArrowDown } from "lucide-react";

interface PWAInstallModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isTablet?: boolean;
}

const steps = [
  {
    icon: Share2,
    title: "Tap the Share button",
    description: "Look for the square with an arrow pointing up in Safari's toolbar (bottom on iPhone, top on iPad).",
  },
  {
    icon: Plus,
    title: 'Find "Add to Home Screen"',
    description: "Scroll down in the share sheet and tap this option.",
  },
  {
    icon: Home,
    title: 'Tap "Add"',
    description: "The MAPIT icon will appear on your home screen — tap it to launch the app.",
  },
];

export function PWAInstallModal({ open, onOpenChange, isTablet = false }: PWAInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isTablet ? "sm:max-w-[680px] p-8" : "sm:max-w-[480px]"
        } overflow-y-auto`}
      >
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-3 mb-3">
            {/* MAPIT icon */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <img
                src="/images/mapit-logo-new.png"
                alt="MAPIT"
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <DialogTitle className={isTablet ? "text-2xl" : "text-xl"}>
                Install MAPIT
              </DialogTitle>
              <DialogDescription className={isTablet ? "text-base mt-1" : "text-sm"}>
                Add to your {isTablet ? "iPad" : "iPhone"} home screen for quick access
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Steps */}
        <div className={`space-y-${isTablet ? "5" : "4"} py-2`}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-4">
                {/* Step number + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex-shrink-0 ${
                      isTablet ? "w-9 h-9 text-base" : "w-7 h-7 text-sm"
                    } rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-500`}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 w-px bg-emerald-500/20 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-${isTablet ? "4" : "3"} flex-1`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`${isTablet ? "h-5 w-5" : "h-4 w-4"} text-emerald-500`} />
                    <p className={`font-semibold ${isTablet ? "text-base" : "text-sm"}`}>
                      {step.title}
                    </p>
                  </div>
                  <p className={`text-muted-foreground ${isTablet ? "text-sm" : "text-xs"} leading-relaxed`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom hint */}
        <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15`}>
          <ArrowDown className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <p className={`text-muted-foreground ${isTablet ? "text-sm" : "text-xs"}`}>
            The share button{" "}
            <span className="font-medium text-foreground">
              <Share2 className="inline h-3 w-3" />
            </span>{" "}
            is in Safari's toolbar. This only works in Safari — not Chrome or Firefox on iOS.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
