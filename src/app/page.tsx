"use client";
import { Sidebar } from "@/components/Sidebar";
import { CommandCenter } from "@/components/CommandCenter";
import { CommunicationsDispatcher } from "@/components/CommunicationsDispatcher";
import { ParityMatrix } from "@/components/ParityMatrix";
import { SystemEngines } from "@/components/SystemEngines";
import { BuildQueue } from "@/components/BuildQueue";
import { ProviderBus } from "@/components/ProviderBus";
import { HealthBeacon } from "@/components/HealthBeacon";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-1">STRATEGIC MINDS</h1>
        <p className="text-sm text-gray-400 mb-6">INTELLIGENCE IN MOTION</p>
        <CommandCenter />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <CommunicationsDispatcher />
          <ParityMatrix />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <SystemEngines />
          <BuildQueue />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <ProviderBus />
          <HealthBeacon />
        </div>
      </main>
    </div>
  );
}
