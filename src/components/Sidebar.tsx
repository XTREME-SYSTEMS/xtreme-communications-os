"use client";
import { Activity, Boxes, Bug, Cloud, Eye, Key, Phone, Radio, Settings, Zap } from "lucide-react";

const navItems = [
  { icon: Eye, label: "Vision Cortex" },
  { icon: Boxes, label: "Autobuilder" },
  { icon: Bug, label: "Faultline" },
  { icon: Cloud, label: "Cloud Browser" },
  { icon: Key, label: "Shadow" },
  { icon: Phone, label: "Telecom Bus" },
  { icon: Radio, label: "Provider Layer" },
  { icon: Zap, label: "Parity" },
  { icon: Activity, label: "Telemetry" },
  { icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-black border-r border-gray-800 p-4 min-h-screen">
      <div className="text-xs font-bold text-green-400 mb-6 tracking-wider">SM//OS</div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-900 rounded cursor-pointer">
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
