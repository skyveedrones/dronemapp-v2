import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Building2, ClipboardList, Download, LayoutDashboard, LogOut, Menu, Moon, Plane, Settings, Sun, Trash2, UserCircle, Users as UsersIcon } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { PWAInstallModal } from "./PWAInstallModal";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const allMenuItems = [
  { icon: Plane, label: "Hire a Pilot", path: "https://www.skyveedrones.com", external: true },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: UsersIcon, label: "Users", path: "/users", roles: ["admin", "webmaster"] },
  { icon: Building2, label: "Clients", path: "/clients", roles: ["admin", "webmaster"] },
  { icon: Trash2, label: "Trash", path: "/trash", roles: ["admin", "webmaster"] },
  { icon: ClipboardList, label: "Audit Log", path: "/audit-log", roles: ["admin", "webmaster"] },
  { icon: Settings, label: "Settings", path: "/settings" },
];

/** Shows org logo if the user has an organization with a logo, otherwise shows MAPIT default */
function OrgOrDefaultLogo() {
  const { user } = useAuth();
  const { data: org } = trpc.organization.getMyOrg.useQuery(undefined, {
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000,
  });

  if (org?.logoUrl) {
    return (
      <img
        src={org.logoUrl}
        alt={org.name}
        className="h-10 md:h-12 w-auto object-contain max-w-[160px]"
      />
    );
  }

  return (
    <img src="/images/mapit-logo-new.png" alt="MAPIT" className="h-12 md:h-14 w-auto object-contain" />
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayoutContent>
      {children}
    </DashboardLayoutContent>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
};

function DashboardLayoutContent({
  children,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { canInstall, isInstalled, platform, isTablet, triggerInstall, showIOSModal, setShowIOSModal } = usePWAInstall();

  const handleInstallClick = async () => {
    if (platform === "ios") {
      setShowIOSModal(true);
      return;
    }
    const result = await triggerInstall();
    if (result === "accepted") {
      toast.success("MAPIT installed!", { description: "Launch it from your desktop or taskbar." });
    } else if (result === "unavailable") {
      toast.info("Install from browser", {
        description: "Click the install icon (⊕) in your address bar, or go to Menu → Install MAPIT.",
        duration: 8000,
      });
    }
  };

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if ((item as any).roles) {
      return (item as any).roles.includes(user?.role);
    }
    return true;
  });
  const activeMenuItem = menuItems.find(item => item.path === location);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Left: Logo — shows org logo for pilots, MAPIT logo for others */}
          <div className="flex items-center">
            <OrgOrDefaultLogo />
          </div>

          {/* Right: Action Center (Theme Toggle, Install Button, User Menu, Hamburger) */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => toggleTheme?.()}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Desktop/Tablet Install Button — only show when installable and not yet installed */}
            {canInstall && !isInstalled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleInstallClick}
                aria-label="Install MAPIT app"
                title="Install MAPIT as a desktop app"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!isMobile && (
                    <div className="flex flex-col gap-0.5 text-left min-w-0">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/account")}
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>My Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  const isExternal = (item as any).external;
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => {
                        if (isExternal) {
                          window.open(item.path, '_blank');
                        } else {
                          setLocation(item.path);
                        }
                      }}
                      className={`cursor-pointer gap-2 ${
                        isActive ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}

                {/* Install App sidebar item — shown when installable */}
                {!isInstalled && (
                  <DropdownMenuItem
                    onClick={handleInstallClick}
                    className="cursor-pointer gap-2 mt-1 border-t border-border/50 pt-2 text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400 focus:bg-emerald-500/10"
                  >
                    <Download className="h-4 w-4" />
                    <span className="font-medium">
                      {isTablet ? "Install iPad App" : "Install Desktop App"}
                    </span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </main>

      {/* iOS / iPad install instructions modal */}
      <PWAInstallModal
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        isTablet={isTablet}
      />
    </div>
  );
}
