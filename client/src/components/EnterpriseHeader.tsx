import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronDown, User, UserCircle, LayoutDashboard, Settings, LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl, getPortalLoginUrl } from "@/const";
import { toast } from "sonner";

interface EnterpriseHeaderProps {
  onContactClick?: () => void;
}

export const EnterpriseHeader = ({ onContactClick }: EnterpriseHeaderProps) => {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const solutionsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const solutionsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (solutionsRef.current && !solutionsRef.current.contains(e.target as Node)) {
        setSolutionsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const handleLogin = () => {
    setLocation("/login");
    setMobileMenuOpen(false);
  };

  const navTo = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
    setSolutionsOpen(false);
  };

  const openSolutions = () => {
    if (solutionsTimeout.current) clearTimeout(solutionsTimeout.current);
    setSolutionsOpen(true);
  };

  const closeSolutionsDelayed = () => {
    solutionsTimeout.current = setTimeout(() => setSolutionsOpen(false), 150);
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/80 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/20"
          : "bg-slate-950/40 backdrop-blur-md border-b border-white/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* ── LOGO ── */}
        <div
          className="flex items-center cursor-pointer group"
          onClick={() => navTo("/")}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src="/images/mapit-logo-new.png"
              alt="MAPIT"
              className="h-12 w-auto relative z-10 transition-transform group-hover:scale-105"
            />
          </div>
        </div>

        {/* ── DESKTOP NAV ── */}
        <nav className="hidden md:flex items-center gap-8">

          {/* Solutions dropdown */}
          <div
            ref={solutionsRef}
            className="relative"
            onMouseEnter={openSolutions}
            onMouseLeave={closeSolutionsDelayed}
          >
            <button
              className="flex items-center gap-1 text-slate-200 hover:text-emerald-400 transition-colors font-medium text-sm"
              onClick={() => setSolutionsOpen((v) => !v)}
            >
              Solutions
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${solutionsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {solutionsOpen && (
              <div
                onMouseEnter={openSolutions}
                onMouseLeave={closeSolutionsDelayed}
                className="absolute top-full left-0 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <button
                  onClick={() => {
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                    setSolutionsOpen(false);
                  }}
                  className="w-full text-left block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Services & Capabilities
                </button>
                <button
                  onClick={() => navTo("/pricing")}
                  className="w-full text-left block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Pricing Plans
                </button>
                <div className="my-1 border-t border-white/5" />
                <button
                  onClick={() => navTo("/municipal")}
                  className="w-full text-left block px-4 py-2.5 text-sm text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors font-medium"
                >
                  Municipal Solutions ↗
                </button>
                {onContactClick && (
                  <button
                    onClick={() => { onContactClick(); setSolutionsOpen(false); }}
                    className="w-full text-left block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    Contact / Briefing
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Municipal — standalone high-visibility link */}
          <button
            onClick={() => navTo("/municipal")}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors tracking-wide border border-emerald-500/30 hover:border-emerald-400/60 px-3 py-1.5 rounded-full hover:bg-emerald-500/10 transition-all"
          >
            Municipal Solutions
          </button>

          {/* Pricing */}
          <button
            onClick={() => navTo("/pricing")}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Pricing
          </button>
        </nav>

        {/* ── RIGHT CONTROLS ── */}
        <div className="hidden md:flex items-center gap-3">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAuthenticated && user ? (
            <>
              {/* Dashboard shortcut */}
              <button
                onClick={() => navTo("/dashboard")}
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>

              {/* User avatar dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-slate-800/50 hover:bg-slate-800 transition-all"
                >
                  {user.logoUrl ? (
                    <img
                      src={user.logoUrl}
                      alt={user.name ?? "User"}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      {userInitials}
                    </div>
                  )}
                  <span className="text-sm text-slate-200 max-w-[100px] truncate">
                    {user.name?.split(" ")[0] ?? "Account"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name ?? "User"}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email ?? ""}</p>
                    </div>
                    <button
                      onClick={() => { navTo("/dashboard"); setUserMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => { navTo("/account"); setUserMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <UserCircle className="h-4 w-4" />
                      My Account
                    </button>
                    <button
                      onClick={() => { navTo("/dashboard/settings"); setUserMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5"
              >
                {loading ? "Loading..." : "Sign In"}
              </button>
              <button
                onClick={() => { window.location.href = getPortalLoginUrl(); }}
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-2"
              >
                Client Portal
              </button>
              <button
                onClick={() => navTo("/municipal")}
                className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Request Briefing
              </button>
            </>
          )}
        </div>

        {/* ── MOBILE HAMBURGER ── */}
        <button
          className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-3 border-b border-white/5 transition-colors"
            >
              Services
            </button>
            <button
              onClick={() => navTo("/pricing")}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-3 border-b border-white/5 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => navTo("/municipal")}
              className="text-left text-sm font-semibold text-emerald-400 hover:text-emerald-300 py-3 border-b border-white/5 transition-colors"
            >
              Municipal Solutions ↗
            </button>

            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 py-3 border-b border-white/5">
                  {user.logoUrl ? (
                    <img src={user.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      {userInitials}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user.name ?? "User"}</p>
                    <p className="text-xs text-slate-400">{user.email ?? ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => navTo("/dashboard")}
                  className="text-left flex items-center gap-3 text-sm text-slate-300 hover:text-white py-3 border-b border-white/5 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="text-left flex items-center gap-3 text-sm text-red-400 hover:text-red-300 py-3 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 pt-3">
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full text-sm font-medium text-white border border-white/20 rounded-lg py-2.5 hover:bg-white/5 transition-colors"
                >
                  {loading ? "Loading..." : "Sign In"}
                </button>
                <button
                  onClick={() => { window.location.href = getPortalLoginUrl(); setMobileMenuOpen(false); }}
                  className="w-full text-sm text-slate-400 hover:text-slate-200 py-2 transition-colors"
                >
                  Client Portal
                </button>
                <button
                  onClick={() => navTo("/municipal")}
                  className="w-full text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg transition-colors"
                >
                  Request Briefing
                </button>
              </div>
            )}

            {/* Theme toggle in mobile */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 text-sm text-slate-400 hover:text-white py-3 mt-1 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Switch to {theme === "dark" ? "Light" : "Dark"} Mode
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default EnterpriseHeader;
