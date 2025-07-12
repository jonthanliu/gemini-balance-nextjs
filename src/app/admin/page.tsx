import { prisma } from "@/lib/db";
import { getKeyManager } from "@/lib/key-manager";
import { getSettings } from "@/lib/settings";
import { AddKeyForm } from "./AddKeyForm";
import { ConfigCard } from "./ConfigCard";
import { KeyList } from "./KeyList";

export const revalidate = 0; // Disable caching

async function getStats() {
  const keyManager = await getKeyManager();
  const keys = keyManager.getAllKeys();
  const validKeys = keys.filter((k) => k.isWorking);
  const invalidKeys = keys.filter((k) => !k.isWorking);

  const requestLogs = await prisma.requestLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const errorLogs = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const totalCalls = await prisma.requestLog.count();
  const successfulCalls = await prisma.requestLog.count({
    where: { isSuccess: true },
  });

  const settings = await getSettings();

  return {
    settings,
    totalKeys: keys.length,
    validKeyCount: validKeys.length,
    invalidKeyCount: invalidKeys.length,
    validKeys,
    invalidKeys,
    requestLogs,
    errorLogs,
    totalCalls,
    successfulCalls,
    failedCalls: totalCalls - successfulCalls,
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of API keys, usage, and system health.
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Keys" value={stats.totalKeys} />
          <StatCard title="Valid Keys" value={stats.validKeyCount} />
          <StatCard title="Invalid Keys" value={stats.invalidKeyCount} />
          <StatCard title="Total API Calls" value={stats.totalCalls} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Config and Key Management */}
          <div className="xl:col-span-1 space-y-8">
            <ConfigCard settings={stats.settings} />
            <AddKeyForm />
            <LogList title="Recent Request Logs" logs={stats.requestLogs} />
            <LogList title="Recent Error Logs" logs={stats.errorLogs} isError />
          </div>

          {/* Right Column: Keys */}
          <div className="xl:col-span-2 space-y-8">
            <KeyList title="Valid Keys" keys={stats.validKeys} />
            <KeyList title="Invalid Keys" keys={stats.invalidKeys} isInvalid />
          </div>
        </div>
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

const LogList = ({
  title,
  logs,
  isError,
}: {
  title: string;
  logs: any[];
  isError?: boolean;
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <ul className="space-y-2 text-sm">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex justify-between p-2 bg-gray-50 rounded-md"
        >
          {isError ? (
            <>
              <span className="text-red-700 truncate" title={log.errorMessage}>
                {log.errorType}
              </span>
              <span className="text-gray-500">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-gray-600">...{log.apiKey}</span>
              <span
                className={`${
                  log.isSuccess ? "text-green-600" : "text-red-600"
                }`}
              >
                {log.statusCode}
              </span>
              <span className="text-gray-500">{log.latency}ms</span>
            </>
          )}
        </li>
      ))}
      {logs.length === 0 && (
        <p className="text-sm text-gray-500">No logs to display.</p>
      )}
    </ul>
  </div>
);
