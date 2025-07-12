import { prisma } from "@/lib/db";
import { getKeyManager } from "@/lib/key-manager";
import { getSettings } from "@/lib/settings";
import { DashboardClient } from "./DashboardClient";

export const revalidate = 0; // Disable caching

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
        <DashboardClient stats={stats} />
      </div>
    </div>
  );
}
