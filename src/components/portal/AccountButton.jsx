import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { User, KeyRound, CreditCard, Settings, LogOut, ChevronDown, Mail, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function AccountButton() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    base44.auth.logout(window.location.origin);
  };

  const initials = (user?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
        title="Account">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
          {user?.full_name?.[0]?.toUpperCase() || initials[0]}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {/* User info */}
          <div className="p-3 border-b border-border bg-accent/30">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                {user?.full_name?.[0]?.toUpperCase() || initials[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            {user?.role && (
              <span className={cn("mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                user.role === "admin" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground")}>
                <Shield className="h-2.5 w-2.5" /> {user.role}
              </span>
            )}
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link to="/portal/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
              <Settings className="h-4 w-4 text-muted-foreground" /> Account Settings
            </Link>
            <Link to="/portal/keys" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
              <KeyRound className="h-4 w-4 text-muted-foreground" /> API Keys
            </Link>
            <Link to="/portal/settings#billing" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Billing & Usage
            </Link>
            <a href={`mailto:support@xtreme-communications.com`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground" /> Support
            </a>
            {user?.role === "admin" && (
              <Link to="/admin-portal" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                <Shield className="h-4 w-4 text-muted-foreground" /> Admin Portal
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="p-1.5 border-t border-border">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}