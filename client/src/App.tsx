import { useAuth } from "@/_core/hooks/useAuth";
import { useVersionCheckOnLogin } from "@/hooks/useVersionCheckOnLogin";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLoginUrl } from "@/const";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalBackground } from "./components/GlobalBackground";
import { ThemeProvider } from "./contexts/ThemeContext";

import { OfflineIndicator } from "./components/OfflineIndicator";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import InviteAccept from "./pages/InviteAccept";
import Clients from "./pages/Clients";
import ClientProjects from "./pages/ClientProjects";
import ClientPortal from "./pages/ClientPortal";
import ClientManage from "./pages/ClientManage";
import ClientInviteAccept from "./pages/ClientInviteAccept";
import ManageUser from "./pages/ManageUser";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Payment from "./pages/Payment";
import Billing from "./pages/Billing";
import Account from "./pages/Account";
import Trash from "./pages/Trash";
import AuditLog from "./pages/AuditLog";
import AdminDashboard from "./pages/AdminDashboard";
import Welcome from "./pages/Welcome";
import OnboardingPilot from "./pages/OnboardingPilot";
import Municipal from "./pages/Municipal";
import Referral from "./pages/Referral";
import SignupPage from "./pages/SignupPage";

// Lazy-loaded map-heavy pages (mapbox-gl is ~1.7MB)
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectMap = lazy(() => import("./pages/ProjectMap"));
const PilotViewCockpit = lazy(() => import("./pages/PilotViewCockpit"));
const FlightDetail = lazy(() => import("./pages/FlightDetail"));
const CreationTutorial = lazy(() => import("./pages/CreationTutorial"));
const DemoProject = lazy(() => import("./pages/DemoProject"));

// Lazy-loaded feature pages (not needed on initial load)
const EasyUpload = lazy(() => import("./pages/features/EasyUpload"));
const InteractiveMaps = lazy(() => import("./pages/features/InteractiveMaps"));
const FlightPathTracking = lazy(() => import("./pages/features/FlightPathTracking"));
const GpsDataExport = lazy(() => import("./pages/features/GpsDataExport"));
const PdfMapOverlay = lazy(() => import("./pages/features/PdfMapOverlay"));
const InstallAsApp = lazy(() => import("./pages/features/InstallAsApp"));
const ProjectTemplates = lazy(() => import("./pages/features/ProjectTemplates"));

/**
 * Admin-only routes that client users must not access
 */
const ADMIN_ONLY_PATHS = ["/", "/dashboard", "/clients", "/users", "/billing", "/settings"];

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated.
 * PHASE 2: Redirects client-role users away from admin-only routes to /portal.
 * Allows unauthenticated access to demo project (ID: 1)
 */
function ProtectedRoute({ component: Component, isDemoRoute = false }: { component: React.ComponentType; isDemoRoute?: boolean }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Skip authentication check for demo routes
  if (isDemoRoute) {
    return <Component />;
  }

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated, setLocation]);

  // Onboarding guard: redirect pilots (non-client users) without an org to /onboarding/pilot
  // Bypassed on localhost for local development
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  useEffect(() => {
    if (isLocalDev) return; // Skip onboarding redirect in local dev
    if (!loading && isAuthenticated && user && !user.organizationId && user.role !== 'client') {
      // Only redirect if not already on onboarding page
      if (location !== '/onboarding/pilot') {
        setLocation('/onboarding/pilot');
      }
    }
  }, [loading, isAuthenticated, user, location, setLocation, isLocalDev]);

  // PHASE 2: Redirect client users away from admin-only routes
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role === 'client') {
      const isAdminRoute = ADMIN_ONLY_PATHS.some(
        (p) => location === p || location.startsWith(p + '/')
      );
      if (isAdminRoute) {
        setLocation('/portal');
      }
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // While client redirect is pending, render nothing to avoid flash
  if (user?.role === 'client' && ADMIN_ONLY_PATHS.some((p) => location === p || location.startsWith(p + '/'))) {
    return null;
  }

  // While onboarding redirect is pending, render nothing to avoid flash
  // Skip this gate on localhost for local development
  if (!isLocalDev && user && !user.organizationId && user.role !== 'client' && location !== '/onboarding/pilot') {
    return null;
  }

  return <Component />;
}

/**
 * ScrollToTop Component
 * Scrolls to top of page when route changes
 */
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

/** Suspense fallback for lazy-loaded pages */
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoadingFallback />}>
      <Switch>
      <Route path="/" component={Home} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={Login} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/payment" component={Payment} />
      <Route path="/account">
        {() => <ProtectedRoute component={Account} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={Users} />}
      </Route>
      <Route path="/project/:id">
        {(params) => {
          // Demo project (ID: 1) doesn't require authentication
          if (params.id === '1') {
            return <ProjectDetail />;
          }
          return <ProtectedRoute component={ProjectDetail} />;
        }}
      </Route>
      <Route path="/project/:id/map">
        {(params) => {
          // Demo project (ID: 1) doesn't require authentication
          if (params.id === '1') {
            return <ProjectMap />;
          }
          return <ProtectedRoute component={ProjectMap} />;
        }}
      </Route>
      <Route path="/project/:id/cockpit">
        {(params) => {
          if (params.id === '1') {
            return <PilotViewCockpit />;
          }
          return <ProtectedRoute component={PilotViewCockpit} />;
        }}
      </Route>
      <Route path="/project/:id/flight/:flightId">
        {(params) => {
          // Demo project (ID: 1) doesn't require authentication
          if (params.id === '1') {
            return <FlightDetail />;
          }
          return <ProtectedRoute component={FlightDetail} />;
        }}
      </Route>
      <Route path="/project/:id/flight/:flightId/map">
        {(params) => {
          // Demo project (ID: 1) doesn't require authentication
          if (params.id === '1') {
            return <ProjectMap />;
          }
          return <ProtectedRoute component={ProjectMap} />;
        }}
      </Route>
      
      {/* Demo Project */}
      <Route path="/demo" component={DemoProject} />
      <Route path="/demo/create-tutorial" component={CreationTutorial} />
      <Route path="/demo/project">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      
      {/* Municipal Solutions */}
      <Route path="/municipal" component={Municipal} />
      
      {/* Referral Program */}
      <Route path="/referral" component={Referral} />
      
      {/* Feature pages */}
      <Route path="/features/easy-upload" component={EasyUpload} />
      <Route path="/features/interactive-maps" component={InteractiveMaps} />
      <Route path="/features/flight-path-tracking" component={FlightPathTracking} />
      <Route path="/features/gps-data-export" component={GpsDataExport} />
      <Route path="/features/pdf-map-overlay" component={PdfMapOverlay} />
      <Route path="/features/install-as-app" component={InstallAsApp} />
      <Route path="/features/project-templates" component={ProjectTemplates} />
      
      {/* Settings */}
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/billing">
        {() => <ProtectedRoute component={Billing} />}
      </Route>
      
      {/* Trash & Audit Log */}
      <Route path="/trash">
        {() => <ProtectedRoute component={Trash} />}
      </Route>
      <Route path="/audit-log">
        {() => <ProtectedRoute component={AuditLog} />}
      </Route>

      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      
      {/* Client management */}
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} />}
      </Route>
      <Route path="/clients/:clientId">
        {() => <ProtectedRoute component={ClientManage} />}
      </Route>
      <Route path="/clients/:clientId/projects">
        {() => <ProtectedRoute component={ClientProjects} />}
      </Route>
      
      {/* Client Portal (for client users to view their projects) */}
      <Route path="/portal">
        {() => <ProtectedRoute component={ClientPortal} />}
      </Route>
      <Route path="/portal/project/:id">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      <Route path="/portal/manage-user">
        {() => <ProtectedRoute component={ManageUser} />}
      </Route>
      
      {/* Onboarding */}
      <Route path="/onboarding/pilot" component={OnboardingPilot} />

      {/* Invitation acceptance pages */}
      <Route path="/invite/:token" component={InviteAccept} />
      <Route path="/client-invite/:token" component={ClientInviteAccept} />
      
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

// NOTE: About Theme
// - Using dark theme for Aerospace Command Center design
// - Colors managed with CSS variables in index.css

/**
 * Version Check on Login Component
 * Automatically checks for version updates when user logs in
 */
function VersionCheckOnLoginWrapper() {
  useVersionCheckOnLogin();
  return null;
}

/**
 * Continuous Version Check Component
 * Periodically checks for version updates every 30 seconds
 */
function ContinuousVersionCheckWrapper() {
  useVersionCheck();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <GlobalBackground />
          <Toaster />
          <OfflineIndicator />
          <VersionCheckOnLoginWrapper />
          <ContinuousVersionCheckWrapper />

          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
