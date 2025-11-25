import React from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, helper }) => (
  <div className="border rounded-lg p-4 shadow-sm">
    <div className="text-sm text-gray-500 mb-1">{label}</div>
    <div className="text-2xl font-semibold mb-1">{value}</div>
    {helper && <div className="text-xs text-gray-400">{helper}</div>}
  </div>
);

const AdminDashboard: React.FC = () => {
  // TODO: questi dati devono arrivare dal backend (tRPC router admin)
  const stats = {
    totalUsers: 0,
    totalVolume24h: 0,
    totalFees24h: 0,
    pendingKyc: 0,
    pendingWithdrawals: 0,
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-gray-500">
        Overview of exchange metrics, KYC queue, withdrawals and system status.
        All data are currently static placeholders and should be connected to
        the admin tRPC routers.
      </p>

      {/* Top stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          label="Total users"
          value={stats.totalUsers}
          helper="Registered accounts"
        />
        <StatCard
          label="24h volume"
          value={`${stats.totalVolume24h} USD`}
          helper="All trading pairs"
        />
        <StatCard
          label="24h fees"
          value={`${stats.totalFees24h} USD`}
          helper="Total collected fees"
        />
      </div>

      {/* KYC & withdrawals */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2">KYC queue</h2>
          <p className="text-sm text-gray-500 mb-2">
            Users waiting for KYC review.
          </p>
          <div className="text-3xl font-semibold mb-2">
            {stats.pendingKyc}
          </div>
          <p className="text-xs text-gray-400">
            TODO: fetch pending KYC verifications from backend.
          </p>
        </div>

        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Pending withdrawals</h2>
          <p className="text-sm text-gray-500 mb-2">
            Crypto withdrawals awaiting manual or automatic approval.
          </p>
          <div className="text-3xl font-semibold mb-2">
            {stats.pendingWithdrawals}
          </div>
          <p className="text-xs text-gray-400">
            TODO: fetch withdrawal requests from backend with filters.
          </p>
        </div>
      </div>

      {/* Logs / recent activity */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <p className="text-sm text-gray-500 mb-2">
          Latest admin actions, security events and system alerts.
        </p>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• TODO: connect to admin logs router (last 50 events)</li>
          <li>• TODO: show failed logins / suspicious activity</li>
          <li>• TODO: show configuration changes (fees, limits, assets)</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
