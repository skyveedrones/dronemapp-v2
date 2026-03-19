/**
 * Warranty Reminder Dialog
 * Configure automated warranty reminder emails with monthly interval or custom date
 */

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Bell, Calendar, Loader2, Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WarrantyReminderDialogProps {
  projectId: number;
  projectName: string;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_TEMPLATES = {
  standard: {
    name: "Standard Reminder",
    subject: "Warranty Reminder: {{projectName}}",
    body: `Dear Client,

This is a friendly reminder that the warranty for project "{{projectName}}" will expire on {{warrantyEndDate}}.

Current warranty period: {{warrantyStartDate}} - {{warrantyEndDate}}
Time remaining: {{timeRemaining}}

Please contact us if you have any questions or would like to schedule a follow-up inspection.

Best regards,
MAPIT`,
  },
  inspection: {
    name: "Inspection Offer",
    subject: "Warranty Expiring Soon - Schedule Inspection: {{projectName}}",
    body: `Dear Client,

The warranty for your project "{{projectName}}" is approaching its expiration date of {{warrantyEndDate}}.

We recommend scheduling a follow-up drone inspection before your warranty expires to document the current condition of the site.

Would you like to schedule an inspection? Reply to this email or call us to set up an appointment.

Best regards,
MAPIT`,
  },
};

export function WarrantyReminderDialog({
  projectId,
  projectName,
  warrantyStartDate,
  warrantyEndDate,
  open,
  onOpenChange,
}: WarrantyReminderDialogProps) {
  const [enabled, setEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [intervalMode, setIntervalMode] = useState<"monthly" | "custom">("monthly");
  const [monthlyInterval, setMonthlyInterval] = useState<string>("3");
  const [customDate, setCustomDate] = useState("");
  const [emailTemplate, setEmailTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("standard");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);

  const utils = trpc.useUtils();

  // Fetch existing reminder config
  const { data: existingConfig, isLoading: configLoading } = trpc.warranty.getReminder.useQuery(
    { projectId },
    { enabled: open && projectId > 0 }
  );

  // Populate form when config loads
  useEffect(() => {
    if (existingConfig) {
      setEnabled(existingConfig.enabled === "yes");
      setReminderEmail(existingConfig.reminderEmail || "");
      try {
        const intervals = JSON.parse(existingConfig.intervals || "[3]");
        if (Array.isArray(intervals) && intervals.length > 0) {
          // Check if it's a custom date (stored as negative number or string)
          if (typeof intervals[0] === "string" && intervals[0].includes("-")) {
            setIntervalMode("custom");
            setCustomDate(intervals[0]);
          } else {
            setIntervalMode("monthly");
            setMonthlyInterval(String(intervals[0]));
          }
        }
      } catch {
        setMonthlyInterval("3");
      }
      if (existingConfig.emailSubject || existingConfig.emailMessage) {
        setUseCustomTemplate(true);
        setCustomSubject(existingConfig.emailSubject || "");
        setCustomBody(existingConfig.emailMessage || "");
      }
    }
  }, [existingConfig]);

  const saveConfig = trpc.warranty.saveReminder.useMutation({
    onSuccess: () => {
      toast.success("Warranty reminders configured successfully!");
      utils.warranty.getReminder.invalidate({ projectId });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to save reminder configuration", {
        description: error.message,
      });
    },
  });

  const sendTestEmail = trpc.warranty.sendTestReminder.useMutation({
    onSuccess: () => {
      toast.success("Test email sent!", {
        description: `Check ${reminderEmail} for the test reminder.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to send test email", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (enabled && !reminderEmail.trim()) {
      toast.error("Please enter an email address for reminders");
      return;
    }

    if (enabled && intervalMode === "custom" && !customDate) {
      toast.error("Please select a custom reminder date");
      return;
    }

    // Store intervals - for monthly, store the number; for custom, store the date string
    const intervals = intervalMode === "monthly" 
      ? [parseInt(monthlyInterval)] 
      : [customDate];

    saveConfig.mutate({
      projectId,
      enabled,
      reminderEmail: reminderEmail.trim(),
      intervals: intervals as number[],
      emailSubject: useCustomTemplate ? customSubject : undefined,
      emailMessage: useCustomTemplate ? customBody : undefined,
    });
  };

  const handleSendTest = () => {
    if (!reminderEmail.trim()) {
      toast.error("Please enter an email address first");
      return;
    }

    sendTestEmail.mutate({
      projectId,
      email: reminderEmail.trim(),
    });
  };

  // Calculate next reminder date based on settings
  const getNextReminderDate = () => {
    if (!warrantyEndDate) return null;
    
    if (intervalMode === "custom" && customDate) {
      return new Date(customDate);
    }
    
    const endDate = new Date(warrantyEndDate);
    const reminderDate = new Date(endDate);
    reminderDate.setMonth(reminderDate.getMonth() - parseInt(monthlyInterval));
    return reminderDate;
  };

  const nextReminderDate = getNextReminderDate();
  const isReminderPast = nextReminderDate && nextReminderDate < new Date();

  if (!warrantyEndDate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Warranty Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Warranty Dates Set</h3>
            <p className="text-muted-foreground mb-4">
              Please set warranty start and end dates in the project settings first.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Warranty Reminder Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated email reminders before warranty expiration for "{projectName}".
          </DialogDescription>
        </DialogHeader>

        {configLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* Warranty Info Display */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Warranty Period</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {warrantyStartDate?.toLocaleDateString()} - {warrantyEndDate.toLocaleDateString()}
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send email reminders before warranty expires
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
              <>
                {/* Email Address */}
                <div className="grid gap-2">
                  <Label htmlFor="reminder-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Reminder Email Address
                  </Label>
                  <Input
                    id="reminder-email"
                    type="email"
                    placeholder="client@example.com"
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email address where warranty reminders should be sent.
                  </p>
                </div>

                {/* Reminder Schedule */}
                <div className="grid gap-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Reminder Schedule
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose when to send the reminder before warranty expiration:
                  </p>
                  
                  {/* Monthly Interval Option */}
                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      intervalMode === "monthly" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setIntervalMode("monthly")}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={intervalMode === "monthly"}
                        onChange={() => setIntervalMode("monthly")}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Send reminder every</span>
                          <Select 
                            value={monthlyInterval} 
                            onValueChange={setMonthlyInterval}
                            disabled={intervalMode !== "monthly"}
                          >
                            <SelectTrigger className="w-24 h-8 bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="font-medium">months before expiration</span>
                        </div>
                        {intervalMode === "monthly" && nextReminderDate && (
                          <p className={`text-xs mt-2 ${isReminderPast ? "text-destructive" : "text-muted-foreground"}`}>
                            {isReminderPast ? "Past date: " : "Next reminder: "}
                            {nextReminderDate.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Date Option */}
                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      intervalMode === "custom" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setIntervalMode("custom")}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={intervalMode === "custom"}
                        onChange={() => setIntervalMode("custom")}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Custom date:</span>
                          <Input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            disabled={intervalMode !== "custom"}
                            className="w-44 h-8 bg-background border-border"
                            max={warrantyEndDate.toISOString().split('T')[0]}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Set a specific date to receive the reminder
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Template Selection */}
                <div className="grid gap-3">
                  <Label>Email Template</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="use-custom"
                      checked={useCustomTemplate}
                      onCheckedChange={(checked) => setUseCustomTemplate(checked as boolean)}
                    />
                    <Label htmlFor="use-custom" className="text-sm font-normal cursor-pointer">
                      Use custom template
                    </Label>
                  </div>

                  {!useCustomTemplate ? (
                    <Select value={emailTemplate} onValueChange={(v) => setEmailTemplate(v as keyof typeof EMAIL_TEMPLATES)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="custom-subject">Subject Line</Label>
                        <Input
                          id="custom-subject"
                          placeholder="Warranty Reminder: {{projectName}}"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="custom-body">Email Body</Label>
                        <Textarea
                          id="custom-body"
                          placeholder="Enter your custom email message..."
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                          className="bg-background border-border resize-none"
                          rows={6}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available placeholders: {"{{projectName}}"}, {"{{warrantyStartDate}}"}, {"{{warrantyEndDate}}"}, {"{{timeRemaining}}"}
                      </p>
                    </div>
                  )}

                  {/* Template Preview */}
                  {!useCustomTemplate && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-1">Subject: {EMAIL_TEMPLATES[emailTemplate].subject}</p>
                      <p className="text-muted-foreground whitespace-pre-line text-xs">
                        {EMAIL_TEMPLATES[emailTemplate].body.substring(0, 200)}...
                      </p>
                    </div>
                  )}
                </div>

                {/* Test Email Button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={sendTestEmail.isPending || !reminderEmail.trim()}
                  >
                    {sendTestEmail.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Test Email
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Preview how the reminder email will look
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
