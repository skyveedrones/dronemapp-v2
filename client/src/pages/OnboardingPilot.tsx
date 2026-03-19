import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Building2, Palette, Upload, CheckCircle, ArrowRight, Loader2 } from "lucide-react";

const STEPS = [
  { id: 1, title: "Organization Info", icon: Building2 },
  { id: 2, title: "Brand Identity", icon: Palette },
  { id: 3, title: "You're Ready!", icon: CheckCircle },
];

export default function OnboardingPilot() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"drone_service_provider" | "municipality" | "engineering_firm" | "other">("drone_service_provider");
  const [brandColor, setBrandColor] = useState("#10b981");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = trpc.organization.uploadLogo.useMutation();
  const createOrg = trpc.organization.create.useMutation({
    onSuccess: () => {
      setStep(3);
    },
    onError: (err) => {
      toast.error("Failed to create organization: " + err.message);
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (): Promise<string | null> => {
    if (!logoFile) return null;
    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });
      const result = await uploadLogo.mutateAsync({
        base64,
        mimeType: logoFile.type,
        fileName: logoFile.name,
      });
      setUploadedLogoUrl(result.url);
      toast.success("Logo uploaded successfully");
      return result.url;
    } catch {
      toast.error("Logo upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleStep1Continue = () => {
    if (!orgName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    let logoUrl = uploadedLogoUrl;
    if (logoFile && !uploadedLogoUrl) {
      logoUrl = await handleLogoUpload();
    }
    createOrg.mutate({
      name: orgName.trim(),
      type: orgType,
      brandColor,
      logoUrl: logoUrl ?? undefined,
    });
  };

  const handleFinish = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl font-bold tracking-tight text-primary">MAPIT</span>
        </div>
        <p className="text-muted-foreground text-sm">Set up your organization to get started</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              <s.icon className="w-3 h-3" />
              {s.title}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${step > s.id ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Organization Info */}
      {step === 1 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Tell us about your agency or company. This information will appear on your client-facing reports and share links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Agency / Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="orgName"
                placeholder="e.g. SkyVee Drones LLC"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStep1Continue()}
              />
              <p className="text-xs text-muted-foreground">This name will appear on all client-facing pages and reports.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgType">Organization Type</Label>
              <Select value={orgType} onValueChange={(v) => setOrgType(v as typeof orgType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drone_service_provider">Drone Service Provider</SelectItem>
                  <SelectItem value="municipality">Municipality / Government</SelectItem>
                  <SelectItem value="engineering_firm">Engineering / Survey Firm</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleStep1Continue}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              <button
                className="underline hover:text-foreground transition-colors"
                onClick={() => {
                  if (!orgName.trim()) {
                    toast.error("Please enter your organization name first");
                    return;
                  }
                  createOrg.mutate({ name: orgName.trim(), type: orgType });
                }}
              >
                Skip branding setup for now
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Brand Identity */}
      {step === 2 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Brand Identity
            </CardTitle>
            <CardDescription>
              Upload your logo and choose your brand color. These will replace the MAPIT branding on your client-facing pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Logo preview" className="h-16 object-contain rounded" />
                    <p className="text-xs text-muted-foreground">{logoFile?.name}</p>
                    {uploadedLogoUrl ? (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleLogoUpload(); }}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                        {isUploading ? "Uploading..." : "Upload to cloud"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm font-medium">Click to upload logo</p>
                    <p className="text-xs">PNG, JPG, SVG up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>

            {/* Brand color */}
            <div className="space-y-2">
              <Label htmlFor="brandColor">Primary Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="brandColor"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-border bg-transparent p-0.5"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#10b981"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for accents and highlights on your branded pages.</p>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-6 object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: brandColor }} />
                )}
                <span className="font-semibold text-sm" style={{ color: brandColor }}>
                  {orgName || "Your Organization"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createOrg.isPending || isUploading}
              >
                {createOrg.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</>
                ) : (
                  <>Save &amp; Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle>You're all set!</CardTitle>
            <CardDescription>
              <strong>{orgName}</strong> has been created. Your dashboard is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What's next</p>
              <ul className="text-sm space-y-1 text-foreground">
                <li>✅ Create your first project</li>
                <li>✅ Upload drone media with GPS data</li>
                <li>✅ Share interactive maps with clients</li>
              </ul>
            </div>
            <Button className="w-full" onClick={handleFinish}>
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
