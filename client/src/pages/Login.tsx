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

  const shouldBypassOAuth = () => {
    if (import.meta.env.DEV) return true;
    if (typeof window === "undefined") return false;
    const host = window.location.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  };

  const submitDevLogin = async () => {
    const fallbackEmail = "clay@skyveedrones.com";
    const payload = JSON.stringify({ email: email.trim() || fallbackEmail });
    const endpoints = ["/api/auth/dev-login", "/api/dev-login"];

    let lastError = "Dev login failed";
    for (const endpoint of endpoints) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      let data: { ok?: boolean; success?: boolean; redirect?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse failure and use status fallback
      }

      const success = data.ok === true || data.success === true || res.ok;
      if (success) {
        window.location.href = data.redirect ?? "/dashboard";
        return;
      }

      lastError = data.error || `Dev login failed (${endpoint})`;
    }

    throw new Error(lastError);
  };

  const submitTempBypassLogin = async () => {
    const payload = JSON.stringify({ email: email.trim(), secret: password });
    const res = await fetch("/api/auth/temp-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    let data: { ok?: boolean; success?: boolean; redirect?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      // ignore JSON parse failure and use status fallback
    }

    const success = data.ok === true || data.success === true || res.ok;
    if (!success) {
      throw new Error(data.error || "Temporary bypass login failed");
    }

    window.location.href = data.redirect ?? "/dashboard";
  };

  const handleBrandedLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // In local dev, bypass Manus OAuth and create a session directly.
    if (shouldBypassOAuth()) {
      try {
        await submitDevLogin();
      } catch (err) {
        console.error("[DevLogin] Request failed:", err);
      }
      return;
    }

    // Production: Trigger OAuth redirect with email pre-fill and dashboard redirect
    window.location.href = getBrandedLoginUrl(email);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (shouldBypassOAuth()) {
      try {
        await submitDevLogin();
      } catch (err) {
        console.error("[DevLogin] Request failed:", err);
      }
      return;
    }

    const tempBypassEnabled = String(import.meta.env.VITE_TEMP_BYPASS_ENABLED || "").toLowerCase() === "true";
    if (tempBypassEnabled && email.trim() && password) {
      try {
        await submitTempBypassLogin();
      } catch (err) {
        console.error("[TempBypass] Request failed:", err);
      }
      return;
    }

    window.location.href = getLoginUrl();
  };

  const handlePortalLogin = async () => {
    if (shouldBypassOAuth()) {
      try {
        await submitDevLogin();
      } catch (err) {
        console.error("[DevLogin] Request failed:", err);
      }
      return;
    }
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

                  import { SignIn } from "@clerk/clerk-react";

                  export default function Login() {
                    return (
                      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1419" }}>
                        <SignIn afterSignInUrl="/api/auth/callback" />
                      </div>
                    );
                  }
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
