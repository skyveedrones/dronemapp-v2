import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Plane, Save, FileText, Sun, Moon, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Templates from "./settings/Templates";
import VersionCheck from "@/components/VersionCheck";

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

        <Tabs defaultValue="pilot" className="w-full">
          <TabsList>
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
