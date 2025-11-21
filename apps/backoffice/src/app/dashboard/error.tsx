'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Common causes:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
            <li>PocketBase is not running</li>
            <li>Admin credentials are incorrect</li>
            <li>Admin account doesn't exist in PocketBase</li>
            <li>Environment variables (PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD) are not set</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="http://localhost:8090/_/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Open PocketBase Admin
          </a>
        </div>
      </div>
    </div>
  );
}

