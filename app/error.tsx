"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">Something went wrong</h1>
        <p className="mb-4 text-xl text-gray-600">
          This page could not be loaded. Please try again shortly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="text-blue-500 underline hover:text-blue-700"
          >
            Try again
          </button>
          <Link href="/" className="text-blue-500 underline hover:text-blue-700">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
