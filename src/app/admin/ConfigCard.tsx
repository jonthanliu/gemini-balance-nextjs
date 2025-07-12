"use client";

"use client";

import { updateSetting } from "./actions";

export const ConfigCard = ({
  settings,
}: {
  settings: {
    MAX_FAILURES: string;
    ALLOWED_TOKENS: string;
  };
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
    <form
      action={async (formData) => {
        const newMaxFailures = formData.get("maxFailures") as string;
        await updateSetting("MAX_FAILURES", newMaxFailures);
      }}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="maxFailures"
          className="block text-sm font-medium text-gray-700"
        >
          Max Failures Threshold
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="number"
            name="maxFailures"
            id="maxFailures"
            defaultValue={settings.MAX_FAILURES}
            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
            min="1"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          A key will be marked as invalid after this many consecutive failures.
        </p>
      </div>
    </form>

    <form
      action={async (formData) => {
        const newAllowedTokens = formData.get("allowedTokens") as string;
        await updateSetting("ALLOWED_TOKENS", newAllowedTokens);
      }}
      className="mt-6"
    >
      <div>
        <label
          htmlFor="allowedTokens"
          className="block text-sm font-medium text-gray-700"
        >
          Allowed API Tokens
        </label>
        <div className="mt-1">
          <textarea
            id="allowedTokens"
            name="allowedTokens"
            rows={4}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            defaultValue={settings.ALLOWED_TOKENS}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Comma-separated list of tokens allowed to access the API. Leave empty
          to allow all.
        </p>
      </div>
      <div className="mt-4">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Tokens
        </button>
      </div>
    </form>
  </div>
);
