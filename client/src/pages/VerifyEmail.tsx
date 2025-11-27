import { useState } from "react";
import { trpc } from "../trpc";
import { toast } from "react-hot-toast";

export default function VerifyEmail() {
  const [code, setCode] = useState("");

  const verify = trpc.verifyEmail.useMutation({
    onSuccess() {
      toast.success("Email verified!");
      window.location.href = "/";
    },
    onError(err) {
      toast.error(err.message);
    }
  });

  const resend = trpc.requestEmailVerification.useMutation({
    onSuccess() {
      toast.success("Verification email sent!");
    }
  });

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Verify your email</h1>

      <input
        className="p-3 border rounded w-full mb-3"
        placeholder="Verification code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white p-3 rounded w-full"
        onClick={() => verify.mutate({ code })}
      >
        Verify
      </button>

      <button
        className="mt-3 text-blue-500 underline"
        onClick={() => resend.mutate()}
      >
        Resend code
      </button>
    </div>
  );
}
