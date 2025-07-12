"use client";

import { addApiKey } from "./actions";

export const AddKeyForm = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Add New API Key
    </h3>
    <form
      action={async (formData) => {
        const apiKey = formData.get("apiKey") as string;
        await addApiKey(apiKey);
      }}
      className="flex rounded-md shadow-sm"
    >
      <input
        type="text"
        name="apiKey"
        id="apiKey"
        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
        placeholder="AIza..."
        required
      />
      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Key
      </button>
    </form>
  </div>
);
