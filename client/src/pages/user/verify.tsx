import { useState } from "react";
import { trpc } from "@/utils/trpc";

export default function Verify() {
  const [docs, setDocs] = useState([]);
  const submit = trpc.auth.submitKyc.useMutation();

  function handleUpload(e) {
    const files = Array.from(e.target.files);
    setDocs(files.map(f => ({ type: "document", fileKey: f.name })));
  }

  async function handleSubmit() {
    await submit.mutateAsync({ documents: docs });
    alert("KYC submitted!");
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Verify your Identity</h1>
      <input type="file" multiple onChange={handleUpload} className="border p-3 w-full" />
      <button onClick={handleSubmit} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
        Submit KYC
      </button>
    </div>
  );
}
