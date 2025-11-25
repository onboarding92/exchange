import React, { useState } from "react";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Admin login placeholder – backend wiring TODO.");

    // TODO: collegare questa pagina all endpoint/mutation tRPC reale
    // per l autenticazione dell amministratore.

    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Admin Login
        </h1>

        <p className="text-sm text-gray-500 mb-4 text-center">
          This is a placeholder admin login page. It will be connected to the
          backend (tRPC) with proper authentication and session handling.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Log in as admin"}
          </button>
        </form>

        {message && (
          <div className="mt-4 text-sm text-center text-blue-600">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
