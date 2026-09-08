import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Brain, FileText, FlaskConical, Users, Radio, GitBranch, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom navigation bar for mobile — most-used daily workflow tools only.
// One-and-done / settings items live in the Settings page.
const MOBILE_NAV = [
  { path: "/portal", label: "Home", icon: LayoutDashboard, exact: true },
  { path: "/portal/crm", label: "CRM", icon: Users },
  { path: "/portal/agents", label: "Agents", icon: Brain },
  { path: "/portal/templates", label: "Templates", icon: FileText },
  { path: "/portal/testing-studio", label: "Test", icon: FlaskConical },
  { path: "/portal/live-monitoring", label: "Live", icon: Radio },
  { path: "/portal/workflow-generator", label: "Workflow", icon: GitBranch },
  { path: "/portal/content-library", label: "Library", icon: Sparkles },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-1 py-1.5 overflow-x-auto scrollbar-thin">
        {MOBILE_NAV.map((item) => {
          const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-[52px] transition-colors",
                active ? "text-primary" : "text-muted-foreground")}>
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}