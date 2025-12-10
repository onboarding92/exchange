import React from "react";
import { trpc } from "../trpc";

/**
 * Shows current users active sessions/devices and allows revocation.
 * Uses backend router: devices.list / devices.revoke
 */
export const DeviceSessionsSection: React.FC = () => {
  const sessionsQuery = trpc.devices.list.useQuery();
  const revokeMutation = trpc.devices.revoke.useMutation();

  const handleRevoke = (token: string) => {
    if (!window.confirm("Do you really want to revoke this session?")) return;
    revokeMutation.mutate(
      { token },
      {
        onSuccess: () => {
          sessionsQuery.refetch();
        },
      }
    );
  };

  if (sessionsQuery.isLoading) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Active sessions / devices</h2>
        <p>Loading sessions...</p>
      </section>
    );
  }

  if (sessionsQuery.error) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Active sessions / devices</h2>
        <p className="text-red-500">
          Failed to load sessions: {sessionsQuery.error.message}
        </p>
      </section>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  if (sessions.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Active sessions / devices</h2>
        <p>No active sessions found.</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-2">Active sessions / devices</h2>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">User agent</th>
              <th className="px-3 py-2 text-left">Created at</th>
              <th className="px-3 py-2 text-left">Last seen</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.token} className="border-t">
                <td className="px-3 py-2">{s.ip ?? "n/a"}</td>
                <td className="px-3 py-2 max-w-xs truncate">
                  {s.userAgent ?? "n/a"}
                </td>
                <td className="px-3 py-2">
                  {s.createdAt ? new Date(s.createdAt).toLocaleString() : "n/a"}
                </td>
                <td className="px-3 py-2">
                  {s.lastSeenAt
                    ? new Date(s.lastSeenAt).toLocaleString()
                    : "n/a"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleRevoke(s.token)}
                    disabled={revokeMutation.isLoading}
                    className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
