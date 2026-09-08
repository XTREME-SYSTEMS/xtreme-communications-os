import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, User, Mail, CreditCard, LogOut, Bell, Shield, Phone, Palette, Brain, HardDrive, MessageCircle, ArrowLeftRight, BookOpen, KeyRound, ChevronRight } from "lucide-react";

export default function PortalSettings() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    base44.auth.logout(window.location.origin);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Settings</h1>

      {/* Account Info */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm text-foreground font-medium">{user?.full_name || "Not set"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
            <span className="text-sm text-foreground font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm text-foreground font-medium capitalize">{user?.role || "user"}</span>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Plan & Billing</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Link to="/pricing" className="text-sm text-primary font-medium hover:underline">View plans →</Link>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Billing</span>
            <Link to="/billing" className="text-sm text-primary font-medium hover:underline">View billing →</Link>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Email alerts for new messages", enabled: true },
            { label: "Low balance warnings", enabled: true },
            { label: "Weekly usage reports", enabled: false },
            { label: "Product updates & news", enabled: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{n.label}</span>
              <span className={`text-xs ${n.enabled ? "text-primary" : "text-muted-foreground"}`}>{n.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Setup & Configuration — one-and-done items */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Setup & Configuration</h2>
        <p className="text-xs text-muted-foreground mb-3">One-time setup tools and configuration pages</p>
        <div className="space-y-1">
          {[
            { to: "/portal/numbers", icon: Phone, label: "Phone Numbers" },
            { to: "/portal/brand-kit", icon: Palette, label: "Brand Kit" },
            { to: "/portal/agent-memory", icon: Brain, label: "Agent Memory" },
            { to: "/portal/google-workspace", icon: HardDrive, label: "Google Workspace Sync" },
            { to: "/portal/whatsapp", icon: MessageCircle, label: "WhatsApp Setup" },
            { to: "/portal/porting", icon: ArrowLeftRight, label: "Number Porting" },
            { to: "/portal/core-docs", icon: BookOpen, label: "Core Documentation" },
            { to: "/portal/keys", icon: KeyRound, label: "API Keys" },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}