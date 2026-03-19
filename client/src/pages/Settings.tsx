import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Plane, Save, FileText, Sun, Moon, Info, Building2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Templates from "./settings/Templates";
import VersionCheck from "@/components/VersionCheck";

function OrganizationSettings() {
  const utils = trpc.useUtils();
  const { data: org, isLoading: orgLoading } = trpc.organization.getMyOrg.useQuery();

  const [orgName, setOrgName] = useState("");
  const [brandColor, setBrandColor] = useState("#10b981");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setBrandColor(org.brandColor || "#10b981");
      setLogoPreview(org.logoUrl || null);
    }
  }, [org]);

  const uploadLogo = trpc.organization.uploadLogo.useMutation();
  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      utils.organization.getMyOrg.invalidate();
      toast.success("Organization updated successfully");
      setHasChanges(false);
      setLogoFile(null);
    },
    onError: (err) => toast.error("Failed to save", { description: err.message }),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setHasChanges(true);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setHasChanges(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    let newLogoUrl: string | null | undefined = undefined;

    if (logoFile) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(logoFile);
      });
      const { url } = await uploadLogo.mutateAsync({
        base64,
        mimeType: logoFile.type,
        fileName: logoFile.name,
      });
      newLogoUrl = url;
    } else if (logoPreview === null && org?.logoUrl) {
      newLogoUrl = null; // explicitly clear
    }

    updateOrg.mutate({
      name: orgName,
      brandColor,
      ...(newLogoUrl !== undefined ? { logoUrl: newLogoUrl } : {}),
    });
  };

  const isSaving = uploadLogo.isPending || updateOrg.isPending;

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          No organization linked to your account. Complete onboarding first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Building2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>
              Update your agency name, logo, and brand color. Changes appear in the dashboard header immediately.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Org Name */}
        <div className="space-y-2">
          <Label htmlFor="orgName">Agency / Company Name</Label>
          <Input
            id="orgName"
            placeholder="e.g. SkyVee Drones"
            value={orgName}
            onChange={(e) => { setOrgName(e.target.value); setHasChanges(true); }}
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <p className="text-xs text-muted-foreground">PNG, JPG, or SVG — max 5 MB. Displayed in the dashboard header.</p>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-80"
                    title="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            {/* Upload button */}
            <div className="flex flex-col gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="mr-2 h-4 w-4" />
                {logoPreview ? "Replace Logo" : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">Recommended: square image, at least 128×128 px</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* Brand Color */}
        <div className="space-y-3">
          <Label htmlFor="brandColor">Primary Brand Color</Label>
          <p className="text-xs text-muted-foreground">Used for accents in client-facing reports and portals.</p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-border flex-shrink-0 cursor-pointer relative overflow-hidden"
              style={{ backgroundColor: brandColor }}
              onClick={() => document.getElementById('brandColorInput')?.click()}
              title="Click to pick color"
            >
              <input
                id="brandColorInput"
                type="color"
                value={brandColor}
                onChange={(e) => { setBrandColor(e.target.value); setHasChanges(true); }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
            <Input
              value={brandColor}
              onChange={(e) => { setBrandColor(e.target.value); setHasChanges(true); }}
              placeholder="#10b981"
              className="w-36 font-mono text-sm"
              maxLength={7}
            />
            <span className="text-sm text-muted-foreground">Click the swatch or type a hex code</span>
          </div>
          {/* Color preview strip */}
          <div className="h-2 rounded-full w-full" style={{ background: `linear-gradient(to right, ${brandColor}22, ${brandColor})` }} />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Changes</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemeSettings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Get current theme from document
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    toast.success(`Theme changed to ${newTheme} mode`);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-emerald-500" />
            ) : (
              <Sun className="h-5 w-5 text-emerald-500" />
            )}
          </div>
          <div>
            <CardTitle>Theme Preference</CardTitle>
            <CardDescription>
              Choose your preferred color theme for the application
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => toggleTheme('light')}
            className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all hover:border-emerald-500/50 ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border bg-card'
            }`}
          >
            <Sun className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Light</div>
              <div className="text-sm text-muted-foreground">Bright and clean</div>
            </div>
          </button>

          <button
            onClick={() => toggleTheme('dark')}
            className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all hover:border-emerald-500/50 ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border bg-card'
            }`}
          >
            <Moon className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Dark</div>
              <div className="text-sm text-muted-foreground">Easy on the eyes</div>
            </div>
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          Your theme preference is saved automatically and will be applied across all pages.
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [dronePilot, setDronePilot] = useState("");
  const [faaLicense, setFaaLicense] = useState("");
  const [laancAuth, setLaancAuth] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: pilotSettings, isLoading } = trpc.pilotSettings.get.useQuery();
  const updateSettings = trpc.pilotSettings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("Failed to save settings", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (pilotSettings) {
      setDronePilot(pilotSettings.defaultDronePilot || "");
      setFaaLicense(pilotSettings.defaultFaaLicenseNumber || "");
      setLaancAuth(pilotSettings.defaultLaancAuthNumber || "");
    }
  }, [pilotSettings]);

  const handleSave = () => {
    updateSettings.mutate({
      defaultDronePilot: dronePilot || null,
      defaultFaaLicenseNumber: faaLicense || null,
      defaultLaancAuthNumber: laancAuth || null,
    });
  };

  const handleChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and default project values
          </p>
        </div>

        <Tabs defaultValue="organization" className="w-full">
          <TabsList>
            <TabsTrigger value="organization">
              <Building2 className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="pilot">
              <Plane className="mr-2 h-4 w-4" />
              Pilot Info
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="theme">
              <Sun className="mr-2 h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="version">
              <Info className="mr-2 h-4 w-4" />
              Version
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="mt-6">
            <OrganizationSettings />
          </TabsContent>

          <TabsContent value="pilot" className="mt-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Plane className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle>Default Pilot Information</CardTitle>
                    <CardDescription>
                      These values will be automatically filled when creating new projects
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dronePilot">Drone Pilot Name</Label>
                      <Input
                        id="dronePilot"
                        placeholder="Enter default pilot name"
                        value={dronePilot}
                        onChange={handleChange(setDronePilot)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="faaLicense">FAA License Number</Label>
                      <Input
                        id="faaLicense"
                        placeholder="Enter FAA license number"
                        value={faaLicense}
                        onChange={handleChange(setFaaLicense)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="laancAuth">LAANC Authorization Number</Label>
                      <Input
                        id="laancAuth"
                        placeholder="Enter LAANC authorization number"
                        value={laancAuth}
                        onChange={handleChange(setLaancAuth)}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updateSettings.isPending}
                      >
                        {updateSettings.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <Templates />
          </TabsContent>

          <TabsContent value="theme" className="mt-6">
            <ThemeSettings />
          </TabsContent>

          <TabsContent value="version" className="mt-6">
            <VersionCheck />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
