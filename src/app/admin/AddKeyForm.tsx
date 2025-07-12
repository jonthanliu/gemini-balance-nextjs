"use client";

import { useRef, useState, useTransition } from "react";
import { addApiKeys } from "./actions";

export const AddKeyForm = () => {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const apiKeys = formData.get("apiKeys") as string;

    startTransition(async () => {
      const result = await addApiKeys(apiKeys);
      if (result.error) {
        setMessage({ text: result.error, type: "error" });
      } else {
        setMessage({ text: result.success!, type: "success" });
        formRef.current?.reset();
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Add New API Keys
      </h3>
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div>
          <textarea
            name="apiKeys"
            id="apiKeys"
            rows={5}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter one or more API keys, separated by new lines."
            required
            disabled={isPending}
          />
        </div>
        <div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            disabled={isPending}
          >
            {isPending ? "Adding..." : "Add Keys"}
          </button>
        </div>
        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
};
