/**
 * Municipal Briefing Request Form
 * Lead capture form for municipal decision-makers.
 * Fields: Name, Title, City/Municipality, Department, Primary Interest (Dropdown), Project Timeline
 * On submit: sends to backend which emails Clay + auto-responds to lead.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2 } from "lucide-react";

interface MunicipalBriefingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const departments = [
  { value: "public-works", label: "Public Works" },
  { value: "engineering", label: "Engineering" },
  { value: "planning", label: "Planning & Development" },
  { value: "fire", label: "Fire Department" },
  { value: "utilities", label: "Utilities" },
  { value: "transportation", label: "Transportation" },
  { value: "city-management", label: "City Management" },
  { value: "other", label: "Other" },
];

const interests = [
  { value: "sub-surface-verification", label: "Sub-Surface Verification" },
  { value: "progress-tracking", label: "Construction Progress Tracking" },
  { value: "design-overlay", label: "Design Plan Overlays" },
  { value: "inter-departmental", label: "Inter-Departmental Mapping" },
  { value: "citizen-reporting", label: "Citizen Accountability Reports" },
  { value: "utility-documentation", label: "Utility Documentation" },
  { value: "pilot-program", label: "Municipal Pilot Program" },
  { value: "general", label: "General Inquiry" },
];

const timelines = [
  { value: "immediate", label: "Immediate (Active project)" },
  { value: "1-3-months", label: "1-3 Months" },
  { value: "3-6-months", label: "3-6 Months" },
  { value: "6-12-months", label: "6-12 Months" },
  { value: "exploratory", label: "Exploratory / No timeline" },
];

export function MunicipalBriefingForm({
  open,
  onOpenChange,
}: MunicipalBriefingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    title: "",
    city: "",
    department: "",
    primaryInterest: "",
    timeline: "",
    message: "",
  });

  const submitMutation = trpc.municipal.submitBriefingRequest.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Failed to submit request. Please try again.");
      console.error("[Municipal Lead]", err);
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.title ||
      !formData.city ||
      !formData.department ||
      !formData.primaryInterest
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    submitMutation.mutate(formData);
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({
      name: "",
      email: "",
      title: "",
      city: "",
      department: "",
      primaryInterest: "",
      timeline: "",
      message: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        {submitted ? (
          /* ─── Success State ─── */
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Briefing Request Received</h3>
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
              Thank you for your interest in MAPIT for{" "}
              <strong className="text-foreground">{formData.city}</strong>. Our
              team will reach out within 24 hours to schedule a demonstration.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          /* ─── Form State ─── */
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle>Request a Municipal Briefing</DialogTitle>
                  <DialogDescription>
                    Tell us about your municipality and we'll prepare a tailored
                    demonstration.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Row: Name + Title */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="muni-name">Full Name *</Label>
                  <Input
                    id="muni-name"
                    name="name"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muni-title">Title / Role *</Label>
                  <Input
                    id="muni-title"
                    name="title"
                    placeholder="City Manager"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="muni-email">Email Address *</Label>
                <Input
                  id="muni-email"
                  name="email"
                  type="email"
                  placeholder="jsmith@springfield.gov"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* City / Municipality */}
              <div className="space-y-2">
                <Label htmlFor="muni-city">City / Municipality *</Label>
                <Input
                  id="muni-city"
                  name="city"
                  placeholder="City of Springfield"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="muni-department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, department: v }))
                  }
                >
                  <SelectTrigger id="muni-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Interest */}
              <div className="space-y-2">
                <Label htmlFor="muni-interest">Primary Interest *</Label>
                <Select
                  value={formData.primaryInterest}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, primaryInterest: v }))
                  }
                >
                  <SelectTrigger id="muni-interest">
                    <SelectValue placeholder="What are you most interested in?" />
                  </SelectTrigger>
                  <SelectContent>
                    {interests.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Timeline */}
              <div className="space-y-2">
                <Label htmlFor="muni-timeline">Project Timeline</Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, timeline: v }))
                  }
                >
                  <SelectTrigger id="muni-timeline">
                    <SelectValue placeholder="When do you need this?" />
                  </SelectTrigger>
                  <SelectContent>
                    {timelines.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="muni-message">Additional Notes</Label>
                <Textarea
                  id="muni-message"
                  name="message"
                  placeholder="Describe your current project or challenge..."
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending
                    ? "Submitting..."
                    : "Submit Request"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
