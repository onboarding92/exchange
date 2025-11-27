import { useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "../trpc";
import { toast } from "react-hot-toast";

export default function ResetPassword() {
  const [params] = useSearch();
  const token = new URLSearchParams(params).get("token") ?? "";
  const [password, setPassword] = useState("");

  const reset = trpc.resetPassword.useMutation({
    onSuccess() {
      toast.success("Password updated!");
      window.location.href = "/login";
    },
    onError(err) {
      toast.error(err.message);
    }
  });

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Reset Password</h1>

      <input
        className="p-3 border rounded w-full mb-3"
        placeholder="New password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white p-3 rounded w-full"
        onClick={() => reset.mutate({ token, password })}
      >
        Update password
      </button>
    </div>
  );
}
