"use client";

import type { KeyManager } from "@/lib/key-manager";
import { deleteApiKeys, resetKeysFailures } from "./actions";

export const KeyList = ({
  title,
  keys,
  isInvalid,
}: {
  title: string;
  keys: ReturnType<KeyManager["getAllKeys"]>;
  isInvalid?: boolean;
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <ul className="space-y-3">
      {keys.map((key) => (
        <li
          key={key.key}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
        >
          <span className="font-mono text-sm text-gray-700">
            ...{key.key.slice(-4)}
          </span>
          <div className="flex items-center space-x-2">
            <a
              href={`/admin?tab=logs&logType=error&search=${key.key}`}
              className="text-xs text-gray-500 hover:underline"
              title="Click to view error logs for this key"
            >
              Fails:{" "}
              <span
                className={key.failCount > 0 ? "text-red-500 font-bold" : ""}
              >
                {key.failCount}
              </span>
            </a>
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                isInvalid
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isInvalid ? "Invalid" : "Valid"}
            </span>
            <button
              onClick={() => resetKeysFailures([key.key])}
              className="text-xs text-blue-600 hover:underline"
            >
              Reset
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete the key ending in ...${key.key.slice(
                      -4
                    )}?`
                  )
                ) {
                  deleteApiKeys([key.key]);
                }
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
      {keys.length === 0 && (
        <p className="text-sm text-gray-500">No keys in this category.</p>
      )}
    </ul>
  </div>
);
