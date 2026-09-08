import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, CheckCircle2, Phone, Brain, KeyRound, Settings, LogOut, ExternalLink, FileText, MessageCircle, ArrowLeftRight, Shield, Sparkles, FlaskConical, Palette, HardDrive, GitBranch, Share2, Radio, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { path: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/portal/onboarding", label: "Onboarding", icon: CheckCircle2 },
  { path: "/portal/numbers", label: "Phone Numbers", icon: Phone },
  { path: "/portal/agents", label: "AI Agents", icon: Brain },
  { path: "/portal/templates", label: "Templates", icon: FileText },
  { path: "/portal/mms-studio", label: "MMS Creative Studio", icon: Sparkles },
  { path: "/portal/testing-studio", label: "Testing Studio", icon: FlaskConical },
  { path: "/portal/brand-kit", label: "Brand Kit", icon: Palette },
  { path: "/portal/agent-memory", label: "Agent Memory", icon: Brain },
  { path: "/portal/google-workspace", label: "Google Workspace", icon: HardDrive },
  { path: "/portal/workflow-generator", label: "Workflow Generator", icon: GitBranch },
  { path: "/portal/content-library", label: "Content Library", icon: Sparkles },
  { path: "/portal/xtreme-social", label: "Xtreme Social", icon: Share2 },
  { path: "/portal/live-monitoring", label: "Live Monitoring", icon: Radio },
  { path: "/portal/whatsapp", label: "WhatsApp Setup", icon: MessageCircle },
  { path: "/portal/porting", label: "Number Porting", icon: ArrowLeftRight },
  { path: "/portal/core-docs", label: "Core Docs", icon: BookOpen },
  { path: "/portal/keys", label: "API Keys", icon: KeyRound },
  { path: "/portal/settings", label: "Settings", icon: Settings },
  { path: "/admin-portal", label: "Admin Portal", icon: Shield, external: true },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout(window.location.origin);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-8 w-8 rounded-lg object-contain" alt="Xtreme Communications" />
          <div className="flex flex-col">
            <span className="font-display text-[11px] tracking-[0.15em] uppercase text-foreground">Xtreme Communications</span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Customer Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map((item) => {
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}