"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clearAllLogs, deleteLogs, getLogs } from "./actions";

type Log = {
  id: number;
  createdAt: Date;
  apiKey?: string;
  errorType?: string;
  errorMessage?: string;
  errorDetails?: string;
  isSuccess?: boolean;
  statusCode?: number;
  latency?: number;
  [key: string]: any;
};

type LogType = "request" | "error";

type KeyInfo = {
  key: string;
  failCount: number;
};

export function LogCenter({ allKeys }: { allKeys: KeyInfo[] }) {
  const searchParams = useSearchParams();
  const initialLogType = (searchParams.get("logType") as LogType) || "error";
  const initialSearch = searchParams.get("search") || "";

  const [logType, setLogType] = useState<LogType>(initialLogType);
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [selected, setSelected] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const limit = 15;

  const fetchLogs = () => {
    startTransition(async () => {
      const result = await getLogs({ logType, search, page, limit });
      if (result.logs) {
        setLogs(result.logs);
        setTotal(result.total || 0);
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to clear all ${logType} logs?`)) {
      startTransition(async () => {
        await clearAllLogs(logType);
        fetchLogs();
      });
    }
  };

  const handleDeleteSelected = () => {
    if (
      selected.length > 0 &&
      confirm(`Are you sure you want to delete ${selected.length} log(s)?`)
    ) {
      startTransition(async () => {
        await deleteLogs(selected, logType);
        setSelected([]);
        fetchLogs();
      });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logType, page, search]);

  const renderLogDetails = (log: Log) => {
    if (logType === "request") {
      return (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="font-semibold">API Key:</span>{" "}
            <span className="font-mono">...{log.apiKey}</span>
          </div>
          <div>
            <span className="font-semibold">Status:</span>{" "}
            <span className={log.isSuccess ? "text-green-600" : "text-red-600"}>
              {log.statusCode}
            </span>
          </div>
          <div>
            <span className="font-semibold">Latency:</span> {log.latency}ms
          </div>
        </div>
      );
    }
    // Error Log
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="font-semibold">API Key:</span>{" "}
          <span className="font-mono">
            {log.apiKey ? `...${log.apiKey.slice(-4)}` : "N/A"}
          </span>
        </div>
        <div>
          <span className="font-semibold">Type:</span> {log.errorType}
        </div>
        <div className="col-span-2">
          <span className="font-semibold">Message:</span> {log.errorMessage}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Log Center</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setLogType("error");
              setPage(1);
              setSelected([]);
            }}
            className={`${
              logType === "error"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Error Logs
          </button>
          <button
            onClick={() => {
              setLogType("request");
              setPage(1);
              setSelected([]);
            }}
            className={`${
              logType === "request"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Request Logs
          </button>
        </nav>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <select
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              fetchLogs();
            }}
            className="border rounded px-2 py-1 bg-white"
          >
            <option value="">All Keys</option>
            {allKeys.map((k) => (
              <option key={k.key} value={k.key}>
                ...{k.key.slice(-4)} (Fails: {k.failCount})
              </option>
            ))}
          </select>
        </div>
        <div className="space-x-2">
          <button
            onClick={handleDeleteSelected}
            disabled={selected.length === 0 || isPending}
            className="bg-red-500 text-white px-4 py-1 rounded disabled:bg-gray-300"
          >
            Delete Selected
          </button>
          <button
            onClick={handleClearAll}
            disabled={isPending}
            className="bg-red-700 text-white px-4 py-1 rounded disabled:bg-gray-300"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        {isPending ? (
          <div className="text-center py-8">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">No logs found.</div>
        ) : (
          logs.map((log) => (
            <details key={log.id} className="bg-gray-50 rounded-lg p-2 border">
              <summary className="cursor-pointer flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-4"
                    checked={selected.includes(log.id)}
                    onChange={(e) => {
                      e.stopPropagation(); // Prevent details from toggling
                      setSelected(
                        e.target.checked
                          ? [...selected, log.id]
                          : selected.filter((id) => id !== log.id)
                      );
                    }}
                  />
                  {renderLogDetails(log)}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </summary>
              <div className="mt-2 pt-2 border-t">
                <h4 className="font-semibold text-xs mb-1">Details:</h4>
                <pre className="bg-gray-900 text-white text-xs p-2 rounded overflow-x-auto">
                  {JSON.stringify(
                    logType === "error"
                      ? JSON.parse(log.errorDetails || "{}")
                      : log,
                    null,
                    2
                  )}
                </pre>
              </div>
            </details>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Page {page} of {Math.ceil(total / limit)}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isPending}
            className="px-4 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * limit >= total || isPending}
            className="px-4 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
