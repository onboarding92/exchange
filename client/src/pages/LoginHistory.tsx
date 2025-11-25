import React from "react";
import { trpc } from "@/trpc";
import { format } from "date-fns";

export default function LoginHistoryPage() {
  const { data, isLoading, isError } = trpc.auth.loginHistory.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 text-gray-200">
        <h1 className="text-2xl font-semibold mb-4">Login history</h1>
        <p>Loading recent logins...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-gray-200">
        <h1 className="text-2xl font-semibold mb-4">Login history</h1>
        <p className="text-red-400">
          Could not load login history. Please try again later.
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-gray-200">
        <h1 className="text-2xl font-semibold mb-4">Login history</h1>
        <p className="text-gray-400">No login events found for your account.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-200">
      <h1 className="text-2xl font-semibold mb-4">Login history</h1>
      <p className="text-sm text-gray-400 mb-4">
        These are the most recent sign-ins to your BitChange account. If you
        see a device, browser or IP address that you don&apos;t recognize,
        change your password immediately and contact support.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-300">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-300">
                IP address
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-300">
                Device / Browser
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((event, idx) => (
              <tr
                key={event.id ?? idx}
                className={idx % 2 === 0 ? "bg-gray-950" : "bg-gray-900/40"}
              >
                <td className="px-4 py-3 whitespace-nowrap text-gray-100">
                  {event.createdAt
                    ? format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss")
                    : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-200">
                  {event.ip ?? "unknown"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {event.userAgent ?? "unknown"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {event.success ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2 py-1 text-xs font-medium text-emerald-300 border border-emerald-700/60">
                      Successful
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-900/40 px-2 py-1 text-xs font-medium text-red-300 border border-red-700/60">
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
