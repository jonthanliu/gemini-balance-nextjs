"use client";

import { updateMaxFailures } from "./actions";

export const ConfigCard = ({
  currentMaxFailures,
}: {
  currentMaxFailures: number;
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
    <form
      action={async (formData) => {
        const newMaxFailures = Number(formData.get("maxFailures"));
        await updateMaxFailures(newMaxFailures);
      }}
    >
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
          defaultValue={currentMaxFailures}
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
    </form>
  </div>
);
