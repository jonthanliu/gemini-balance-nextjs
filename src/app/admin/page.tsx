"use client";

import { prisma } from "@/lib/db";
import { getKeyManager } from "@/lib/key-manager";
import { getSettings } from "@/lib/settings";
import { useState } from "react";
import { AddKeyForm } from "./AddKeyForm";
import { ConfigCard } from "./ConfigCard";
import { KeyList } from "./KeyList";
import { LogCenter } from "./LogCenter";

// This is a server component, but we need client-side interactivity for tabs.
// A common pattern is to create a client component that wraps server components.
// Here, we'll make the page a client component and fetch data inside.
// Note: In a real-world app, you might pass server components as children to a client layout component.

// Data fetching function (can be called from a client component)
async function getStats() {
  // This function would now need to be called via a Server Action or API route
  // if we make the whole page a client component.
  // For simplicity, we'll keep it as a server component and create a client wrapper for the tabs.
}

// A simple client component for the tabbed layout
const AdminTabs = ({ stats }: { stats: any }) => {
  const [activeTab, setActiveTab] = useState("dashboard");

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
        {activeTab === "logs" && <LogCenter />}
      </div>
    </div>
  );
};

export default async function AdminPage() {
  const keyManager = await getKeyManager();
  const keys = keyManager.getAllKeys();
  const validKeys = keys.filter((k) => k.isWorking);
  const invalidKeys = keys.filter((k) => !k.isWorking);

  const totalCalls = await prisma.requestLog.count();
  const successfulCalls = await prisma.requestLog.count({
    where: { isSuccess: true },
  });

  const settings = await getSettings();

  const stats = {
    settings,
    totalKeys: keys.length,
    validKeyCount: validKeys.length,
    invalidKeyCount: invalidKeys.length,
    validKeys,
    invalidKeys,
    totalCalls,
    successfulCalls,
    failedCalls: totalCalls - successfulCalls,
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of API keys, usage, and system health.
          </p>
        </header>
        <AdminTabs stats={stats} />
      </div>
    </div>
  );
}

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
