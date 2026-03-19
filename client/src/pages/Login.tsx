/**
 * Login Page — Premium Glassmorphism Redesign
 * Full-screen drone aerial background with centered glass card
 * MAPIT / SkyVee branding, Manus OAuth flow
 */

import { getLoginUrl, getPortalLoginUrl, getBrandedLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Map, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const BG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/login-bg_2a4087db.jpg";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleBrandedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger OAuth redirect with email pre-fill and dashboard redirect
    window.location.href = getBrandedLoginUrl(email);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    window.location.href = getLoginUrl();
  };

  const handlePortalLogin = () => {
    window.location.href = getPortalLoginUrl();
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/60 to-emerald-950/70 z-0" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 z-10 flex items-center gap-2">
        <img
          src="/images/mapit-logo.webp"
          alt="MAPIT"
          className="h-8 w-auto"
          onLoad={(e) => {
            // hide the text fallback when image loads
            const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "none";
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span
          className="text-white text-xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-display, 'Orbitron', sans-serif)" }}
        >
          MAP<span className="text-emerald-400">i</span>T
        </span>
      </div>

      {/* Main glass card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
          style={{
            background: "rgba(10, 20, 25, 0.72)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Card header accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          <div className="px-8 pt-8 pb-10 space-y-7">
            {/* Logo + headline */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <Map className="w-7 h-7 text-emerald-400" />
              </div>
              <h1
                className="text-2xl font-bold text-white tracking-wide"
                style={{ fontFamily: "var(--font-display, 'Orbitron', sans-serif)" }}
              >
                Welcome Back
              </h1>
              <p className="text-sm text-white/50">
                Sign in to your MAPIT account to continue
              </p>
            </div>

            {/* Email + Password form — editable fields, redirect only on submit */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white/80 placeholder-white/25 outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid rgba(16,185,129,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm text-white/80 placeholder-white/25 outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid rgba(16,185,129,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between" id="login-form">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      rememberMe
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-white/20 bg-white/5 group-hover:border-emerald-500/50"
                    }`}
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">Remember me</span>
                </label>
                <button
                  onClick={handleLogin}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </form>

            {/* Primary Sign In button */}
            <button
              type="submit"
              onClick={handleBrandedLogin}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm text-white transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "linear-gradient(135deg, #34d399 0%, #10b981 100%)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)";
              }}
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google sign-in */}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg text-sm font-medium text-white/80 transition-all duration-200 hover:text-white hover:border-white/25 active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              }}
            >
              {/* Google G logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Client portal link */}
            <div className="text-center">
              <button
                onClick={handlePortalLogin}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-emerald-400 transition-colors"
              >
                <Map className="w-3.5 h-3.5" />
                Client Portal Login
              </button>
            </div>

            {/* New user */}
            <p className="text-center text-xs text-white/35">
              Don't have an account?{" "}
              <button
                onClick={handleLogin}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                Create one free
              </button>
            </p>
          </div>
        </div>

        {/* Lock badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex items-center justify-center gap-1.5 text-white/30 text-xs"
        >
          <Lock className="w-3 h-3" />
          <span>256-bit encrypted · Secured by Manus OAuth</span>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-6 text-xs text-white/25">
        <span>© 2026 MAPIT by SkyVee Drones</span>
        <span className="w-px h-3 bg-white/15" />
        <a
          href="#"
          className="hover:text-white/50 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Terms of Service
        </a>
        <span className="w-px h-3 bg-white/15" />
        <a
          href="#"
          className="hover:text-white/50 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
