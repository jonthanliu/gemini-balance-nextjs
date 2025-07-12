"use client";

import { useEffect, useState, useTransition } from "react";
import { clearAllLogs, deleteLogs, getLogs } from "./actions";

type Log = {
  id: number;
  createdAt: Date;
  [key: string]: any;
};

type LogType = "request" | "error";

export function LogCenter() {
  const [logType, setLogType] = useState<LogType>("request");
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
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

  // Fetch logs on initial render and when dependencies change
  useEffect(() => {
    fetchLogs();
  }, [logType, page]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Log Center</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setLogType("request")}
            className={`${
              logType === "request"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Request Logs
          </button>
          <button
            onClick={() => setLogType("error")}
            className={`${
              logType === "error"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Error Logs
          </button>
        </nav>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center mb-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border rounded px-2 py-1"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-1 rounded"
          >
            Search
          </button>
        </form>
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

      {/* Log Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(e.target.checked ? logs.map((l) => l.id) : [])
                  }
                  checked={selected.length === logs.length && logs.length > 0}
                />
              </th>
              {logType === "request" ? (
                <>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-gray-500"
                  >
                    API Key
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-gray-500"
                  >
                    Latency
                  </th>
                </>
              ) : (
                <>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-gray-500"
                  >
                    Error Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-gray-500"
                  >
                    Message
                  </th>
                </>
              )}
              <th
                scope="col"
                className="px-4 py-3 text-left font-medium text-gray-500"
              >
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isPending ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <div className="font-medium">Loading...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <div className="font-medium">No logs found.</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(log.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, log.id]
                            : selected.filter((id) => id !== log.id)
                        )
                      }
                    />
                  </td>
                  {logType === "request" ? (
                    <>
                      <td className="px-4 py-3 font-mono">...{log.apiKey}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            log.isSuccess ? "text-green-600" : "text-red-600"
                          }
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.latency}ms</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-red-600">
                        {log.errorType}
                      </td>
                      <td
                        className="px-4 py-3 truncate max-w-sm"
                        title={log.errorMessage}
                      >
                        {log.errorMessage}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
