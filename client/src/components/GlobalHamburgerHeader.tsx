import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, X, User, UserCircle, ChevronRight, LayoutDashboard, Settings, LogOut, Sun, Moon, Share2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export const GlobalHamburgerHeader = () => {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isNavOpen]);

  const navTo = (path: string) => {
    setLocation(path);
    setIsNavOpen(false);
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setUserMenuOpen(false);
    setIsNavOpen(false);
  };

  const handleLogin = () => {
    setLocation("/login");
    setIsNavOpen(false);
  };

  // Derive initials: prefer real user name, fallback to "CB" for owner
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "CB";

  return (
    <>
      {/* ── FIXED HEADER BAR ── */}
      <header
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20"
            : "bg-slate-950/60 backdrop-blur-xl border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* LOGO — branded image with green pin */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navTo("/")}
          >
            <img
              src="/images/mapit-logo-branded.png"
              alt="MAPIT"
              className="h-[52px] w-auto object-contain transition-transform group-hover:scale-105 select-none"
              draggable={false}
            />
          </div>

          {/* RIGHT: USER AVATAR + HAMBURGER */}
          <div className="flex items-center gap-4">

            {/* USER AVATAR */}
            <div ref={userMenuRef} className="relative">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-emerald-500/60 transition-all overflow-hidden"
                    style={{ background: "#10b981" }}
                    aria-label="User menu"
                  >
                    <span
                      className="text-xs font-bold tracking-wide"
                      style={{ color: "#0f172a" }}
                    >
                      {userInitials}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl py-3 mt-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={() => navTo("/dashboard")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => navTo("/account")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        My Account
                      </button>
                      <button
                        onClick={() => navTo("/dashboard/settings")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="border-t border-white/5 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:border-emerald-500/60 transition-all"
                  aria-label="Sign in"
                >
                  <User className="w-5 h-5 text-slate-300" />
                </button>
              )}
            </div>

            {/* HAMBURGER */}
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 text-white hover:text-emerald-400 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </header>

      {/* ── SLIDE-OUT DRAWER ── */}
      {isNavOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsNavOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-sm bg-slate-900 h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Close */}
            <button
              onClick={() => setIsNavOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="mt-12 space-y-8">
              {/* Theme toggle — top of menu */}
              <button
                onClick={() => toggleTheme?.()}
                className="flex items-center gap-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Navigation</div>

              <nav className="flex flex-col gap-6" style={{ fontFamily: "var(--font-display)" }}>

                {/* Solutions section */}
                <div className="space-y-4">
                  <div className="text-2xl font-bold text-slate-200">Solutions</div>
                  <div className="flex flex-col gap-4 pl-4 border-l border-white/10">
                    <button
                      onClick={() => {
                        setIsNavOpen(false);
                        setTimeout(() => {
                          document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                        }, 300);
                      }}
                      className="text-lg text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left w-full font-semibold"
                    >
                      Services <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/municipal")}
                      className="text-lg text-emerald-400 hover:text-emerald-300 flex items-center gap-2 transition-colors text-left w-full font-semibold"
                    >
                      Municipal Solutions <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/dashboard")}
                      className="text-lg text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left font-semibold"
                    >
                      Projects <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/pricing")}
                      className="text-lg text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left font-semibold"
                    >
                      Pricing <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navTo("/referral")}
                      className="text-lg text-emerald-400 hover:text-emerald-300 flex items-center gap-2 transition-colors text-left w-full font-semibold"
                    >
                      <Share2 className="w-4 h-4" /> Referral Program <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Auth actions */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  {isAuthenticated && user ? (
                    <>
                      <button
                        onClick={() => navTo("/dashboard")}
                        className="text-lg text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left w-full font-semibold"
                      >
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="text-lg text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors text-left w-full font-semibold"
                      >
                        <LogOut className="w-5 h-5" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="text-lg text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left font-semibold"
                    >
                      <User className="w-5 h-5" />
                      {loading ? "Loading..." : "Sign In"}
                    </button>
                  )}
                </div>
              </nav>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-white/10 pt-8">
              <img
                src="/images/mapit-logo-branded.png"
                alt="MAPIT"
                className="h-8 w-auto object-contain opacity-40 mb-4 select-none"
                draggable={false}
              />
              <p className="text-xs text-slate-600">
                © 2026 MAPIT Geospatial.
                <br />
                Precision Aerial Intelligence.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalHamburgerHeader;
