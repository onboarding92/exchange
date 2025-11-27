import { useState } from "react";
import { trpc } from "../trpc";
import { toast } from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const req = trpc.forgotPassword.useMutation({
    onSuccess() {
      toast.success("If your email exists, you will receive a reset link.");
    }
  });

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Forgot Password</h1>

      <input
        className="p-3 border rounded w-full mb-3"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white p-3 rounded w-full"
        onClick={() => req.mutate({ email })}
      >
        Send reset link
      </button>
    </div>
  );
}
