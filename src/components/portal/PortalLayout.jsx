import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, CheckCircle2, Phone, PhoneCall, Brain, KeyRound, Settings, LogOut, ExternalLink, FileText, MessageCircle, ArrowLeftRight, Shield, Sparkles, FlaskConical, Palette, HardDrive, GitBranch, Share2, Radio, BookOpen, Users, Tag, Building2, Link2, CreditCard, Rocket, Zap, MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileNav from "@/components/portal/MobileNav";
import AccountButton from "@/components/portal/AccountButton";
import BreezeCopilot from "@/components/portal/BreezeCopilot";

// ── CORE NAV: the 7 most important daily tools ──
const CORE_NAV = [
  { path: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/portal/crm", label: "CRM", icon: Users },
  { path: "/portal/agent-factory", label: "Agent Factory", icon: Rocket },
  { path: "/portal/sms-inbox", label: "SMS Inbox", icon: MessageSquare },
  { path: "/portal/lead-scraper", label: "Lead Scraper", icon: Sparkles },
  { path: "/portal/whatsapp-outreach", label: "Outreach", icon: MessageCircle },
  { path: "/portal/workflow-test-lab", label: "Test Lab", icon: FlaskConical },
];

// ── MORE TOOLS: secondary tools, collapsible ──
const MORE_NAV = [
  { path: "/portal/digital-team-builder", label: "AI Team Builder", icon: Users },
  { path: "/portal/action-test", label: "Action Test", icon: Zap },
  { path: "/portal/vision-cortex", label: "Vision Cortex", icon: Brain },
  { path: "/portal/doc-specialist", label: "Doc Specialist", icon: FileText },
  { path: "/portal/agent-generator", label: "Agent Generator", icon: Rocket },
  { path: "/portal/agents", label: "AI Agents", icon: Brain },
  { path: "/portal/templates", label: "Templates", icon: FileText },
  { path: "/portal/testing-studio", label: "Testing Studio", icon: FlaskConical },
  { path: "/portal/live-monitoring", label: "Live Monitoring", icon: Radio },
  { path: "/portal/workflow-generator", label: "Workflow Generator", icon: GitBranch },
  { path: "/portal/content-library", label: "Content Library", icon: Sparkles },
  { path: "/portal/mms-studio", label: "MMS Studio", icon: Palette },
  { path: "/portal/xtreme-social", label: "Xtreme Social", icon: Share2 },
  { path: "/portal/coupons", label: "Coupons", icon: Tag },
  { path: "/portal/business-cards", label: "Business Cards", icon: CreditCard },
  { path: "/portal/company-showcase", label: "Company Showcase", icon: Building2 },
  { path: "/portal/link-builder", label: "Link Builder", icon: Link2 },
];

// ── SETTINGS & SETUP: one-and-done configuration ──
const SETTINGS_NAV = [
  { path: "/portal/onboarding", label: "Onboarding", icon: CheckCircle2 },
  { path: "/portal/numbers", label: "Phone Numbers", icon: Phone },
  { path: "/portal/number-workflow", label: "Number Workflow", icon: PhoneCall },
  { path: "/portal/brand-kit", label: "Brand Kit", icon: Palette },
  { path: "/portal/agent-memory", label: "Agent Memory", icon: Brain },
  { path: "/portal/google-workspace", label: "Google Workspace", icon: HardDrive },
  { path: "/portal/whatsapp", label: "WhatsApp Setup", icon: MessageCircle },
  { path: "/portal/porting", label: "Number Porting", icon: ArrowLeftRight },
  { path: "/portal/core-docs", label: "Core Docs", icon: BookOpen },
  { path: "/portal/connect", label: "Connect AI Assistant", icon: Link2 },
  { path: "/portal/keys", label: "API Keys", icon: KeyRound },
  { path: "/portal/settings", label: "Settings", icon: Settings },
  { path: "/admin-portal", label: "Admin Portal", icon: Shield, external: true },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const handleLogout = () => {
    base44.auth.logout(window.location.origin);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ===== DESKTOP: sidebar layout ===== */}
      <div className="md:flex">
        <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col h-screen sticky top-0">
          {/* Logo */}
          <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
            <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-8 w-8 rounded-lg object-contain" alt="Xtreme Communications" />
            <div className="flex flex-col">
              <span className="font-display text-[11px] tracking-[0.15em] uppercase text-foreground">Xtreme Communications</span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Customer Portal</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
            {CORE_NAV.map((item) => {
              const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {/* More Tools — collapsible */}
            <button onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", showMore && "rotate-180")} />
              More Tools
            </button>
            {showMore && MORE_NAV.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors pl-6",
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {/* Settings & Setup */}
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Settings & Setup</p>
            {SETTINGS_NAV.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-border p-3 space-y-2">
            <Link to="/" className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3 w-3" /> Marketing Site
            </Link>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user?.full_name || user?.email || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-h-screen">
          {/* ===== MOBILE: top bar ===== */}
          <div className="md:hidden sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 h-14">
              <Link to="/portal" className="flex items-center gap-2">
                <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-7 w-7 rounded object-contain" alt="Xtreme" />
                <span className="font-display text-xs tracking-wider uppercase text-foreground">Xtreme</span>
              </Link>
              <AccountButton />
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      {/* ===== MOBILE: bottom nav ===== */}
      <MobileNav />

      {/* ===== Breeze AI Copilot (both desktop + mobile) ===== */}
      <BreezeCopilot />
    </div>
  );
}