"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AddKeyForm } from "./AddKeyForm";
import { ConfigCard } from "./ConfigCard";
import { KeyList } from "./KeyList";
import { LogCenter } from "./LogCenter";

const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

export function DashboardClient({ stats }: { stats: any }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs = [
    { id: "dashboard", label: "Monitoring Dashboard" },
    { id: "config", label: "System Configuration" },
    { id: "logs", label: "Log Center" },
  ];

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === "dashboard" && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Keys" value={stats.totalKeys} />
              <StatCard title="Valid Keys" value={stats.validKeyCount} />
              <StatCard title="Invalid Keys" value={stats.invalidKeyCount} />
              <StatCard title="Total API Calls" value={stats.totalCalls} />
            </div>
            <div className="space-y-8">
              <KeyList title="Valid Keys" keys={stats.validKeys} />
              <KeyList
                title="Invalid Keys"
                keys={stats.invalidKeys}
                isInvalid
              />
            </div>
          </div>
        )}
        {activeTab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ConfigCard settings={stats.settings} />
            <AddKeyForm />
          </div>
        )}
        {activeTab === "logs" && (
          <LogCenter allKeys={stats.validKeys.concat(stats.invalidKeys)} />
        )}
      </div>
    </div>
  );
}
