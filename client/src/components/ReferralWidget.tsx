import { useState } from "react";
import {
  Share2,
  Copy,
  CheckCircle,
  Users,
  Mail,
  User,
  Clock,
  CheckCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  FileText,
  Gift,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const TOPO_SVG = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-40-39c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm20-27c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zM0 80c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm80 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm0-80c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10z' fill='%2310b981' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`;

type EmailApp = "system" | "gmail" | "outlook" | "yahoo";

const EMAIL_APP_OPTIONS: Array<{ value: EmailApp; label: string }> = [
  { value: "system", label: "Default Email App" },
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook" },
  { value: "yahoo", label: "Yahoo Mail" },
];

function buildReferralSlug(name: string, id: number): string {
  const first = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  return `${first}${id}`;
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function buildEmailBody(referrerName: string, refereeName: string, referralLink: string): string {
  return `Hi ${refereeName},

I've been using Mapit for my drone mapping projects and thought you'd find it really useful. It turns aerial footage into interactive maps with GPS tagging, flight path tracking, PDF overlays, and more.

Here's the deal: sign up using my referral link and when you upgrade to a Pro plan, we both get 1 month free.

Get started here: ${referralLink}

What you get with Mapit:
- Upload drone photos & videos with automatic GPS extraction
- Interactive maps with markers, popups, and flight paths
- Export GPS data in KML, CSV, GeoJSON, and GPX
- Overlay construction plans on satellite maps
- Generate professional PDF reports

Let me know if you have any questions!

${referrerName}`;
}

function buildEmailSubject(referrerName: string): string {
  return `${referrerName} invited you to try Mapit - Drone Mapping Platform`;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pending", color: "text-yellow-400", icon: Clock },
  signed_up: { label: "Signed Up", color: "text-blue-400", icon: CheckCheck },
  converted: { label: "Converted", color: "text-[#10b981]", icon: CheckCircle },
};

export const ReferralWidget = () => {
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string; to: string } | null>(null);
  const [preferredEmailApp, setPreferredEmailApp] = useState<EmailApp>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem("mapit-referral-email-app");
    return saved === "gmail" || saved === "outlook" || saved === "yahoo" || saved === "system"
      ? saved
      : "system";
  });

  const slug = user ? buildReferralSlug(user.name ?? "pilot", user.id) : "pilot";
  const referralLink = `https://mapit.skyveedrones.com/signup?ref=${slug}`;
  const referrerName = user?.name ?? "A Mapit user";

  const userInitials = user
    ? (user.name ?? "")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    : "U";

  const utils = trpc.useUtils();
  const referralList = trpc.referral.list.useQuery(undefined, { enabled: !!user });
  const referralStats = trpc.referral.stats.useQuery(undefined, { enabled: !!user });

  const recordReferral = trpc.referral.send.useMutation({
    onSuccess: () => {
      utils.referral.list.invalidate();
      utils.referral.stats.invalidate();
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refereeName.trim() || !refereeEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }

    const subject = buildEmailSubject(referrerName);
    const body = buildEmailBody(referrerName, refereeName.trim(), referralLink);

    setGeneratedEmail({ subject, body, to: refereeEmail.trim() });

    // Record the referral in the database
    recordReferral.mutate({
      refereeName: refereeName.trim(),
      refereeEmail: refereeEmail.trim(),
    });

    toast.success("Email generated! Copy it or open in your email app.");
  };

  const handleCopyEmail = () => {
    if (!generatedEmail) return;
    const fullText = `To: ${generatedEmail.to}\nSubject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedEmail(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const getComposeUrl = (app: EmailApp, email: { to: string; subject: string; body: string }): string => {
    const to = encodeURIComponent(email.to);
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(email.body);

    if (app === "gmail") {
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    }

    if (app === "outlook") {
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
    }

    if (app === "yahoo") {
      return `https://compose.mail.yahoo.com/?to=${to}&subject=${subject}&body=${body}`;
    }

    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const handleOpenEmail = () => {
    if (!generatedEmail) return;
    const composeUrl = getComposeUrl(preferredEmailApp, generatedEmail);
    window.open(composeUrl, "_blank");
  };

  const handlePreferredAppChange = (value: string) => {
    const next = value as EmailApp;
    setPreferredEmailApp(next);
    window.localStorage.setItem("mapit-referral-email-app", next);
  };

  const handleReset = () => {
    setGeneratedEmail(null);
    setRefereeName("");
    setRefereeEmail("");
  };

  const stats = referralStats.data;
  const referrals = referralList.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-slate-900 border border-white/10 rounded-3xl p-8 overflow-hidden relative"
    >
      {/* Topo Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{ backgroundImage: TOPO_SVG }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-slate-950 font-bold text-sm flex-shrink-0">
            {userInitials}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#10b981]" />
              Referral Program
            </h3>
            <p className="text-slate-400 text-sm">
              Grow the MAPIT network and earn rewards.
            </p>
          </div>
        </div>

        {/* Reward Box */}
        <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 mb-6">
          <h4 className="text-[#10b981] font-semibold mb-2">The Reward</h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            Invite a colleague. When they upgrade to a Pro plan,{" "}
            <strong className="text-white">both of you get 1 month free.</strong>
          </p>
        </div>

        {/* Referral Link Copy */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm font-mono truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopyLink}
            className="px-5 py-3 bg-[#10b981] hover:bg-[#0da673] text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {copiedLink ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copiedLink ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Generate Referral Email Section */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {!generatedEmail ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleGenerateEmail}
                className="bg-slate-950/50 border border-white/10 rounded-2xl p-5 space-y-4"
              >
                <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#10b981]" />
                  Send a Referral Email
                </h4>
                <p className="text-slate-500 text-xs">
                  Enter their info and we'll generate a ready-to-send email for you.
                </p>

                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
                    Their Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={refereeName}
                      onChange={(e) => setRefereeName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#10b981]/50 focus:ring-1 focus:ring-[#10b981]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
                    Their Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={refereeEmail}
                      onChange={(e) => setRefereeEmail(e.target.value)}
                      placeholder="john@company.com"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#10b981]/50 focus:ring-1 focus:ring-[#10b981]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recordReferral.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#10b981] hover:bg-[#0da673] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition-all text-sm"
                >
                  {recordReferral.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Email
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-950/50 border border-white/10 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10b981]" />
                    Email Ready
                  </h4>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    New Referral
                  </button>
                </div>

                {/* Email Preview */}
                <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 w-10">To:</span>
                      <span className="text-white">{generatedEmail.to}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 w-10">Subj:</span>
                      <span className="text-white">{generatedEmail.subject}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 max-h-48 overflow-y-auto custom-scrollbar">
                    <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedEmail.body}
                    </pre>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1">
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500">Preferred Email App</label>
                  <select
                    value={preferredEmailApp}
                    onChange={(e) => handlePreferredAppChange(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10b981]/50 focus:ring-1 focus:ring-[#10b981]/20"
                  >
                    {EMAIL_APP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyEmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold rounded-xl transition-all text-sm"
                  >
                    {copiedEmail ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-[#10b981]" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleOpenEmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#10b981] hover:bg-[#0da673] text-slate-950 font-bold rounded-xl transition-all text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in {EMAIL_APP_OPTIONS.find((opt) => opt.value === preferredEmailApp)?.label ?? "Email App"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="flex gap-8 border-t border-white/5 pt-6 mb-6">
          <div>
            <div className="text-2xl font-bold text-white">
              {stats?.totalSent ?? "—"}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
              Invites Sent
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#10b981]">
              {stats?.monthsEarned ?? "—"}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
              Months Earned
            </div>
          </div>
          <div className="ml-auto flex items-end">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Sent Referrals List */}
        {referrals.length > 0 && (
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-widest mb-3">
              Sent Referrals
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {referrals.map((ref) => {
                const sc = statusConfig[ref.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={ref.id}
                    className="flex items-center gap-3 bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {ref.refereeName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {ref.refereeEmail}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className={`flex items-center gap-1 text-xs ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {timeAgo(ref.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReferralWidget;
