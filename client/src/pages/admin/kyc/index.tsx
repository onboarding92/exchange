import { trpc } from "@/utils/trpc";

export default function KycAdmin() {
  const { data } = trpc.auth.adminListKycPending.useQuery();
  const review = trpc.auth.adminReviewKyc.useMutation();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">KYC Pending Requests</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Email</th>
            <th className="p-2">Docs</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.map(u => (
            <tr key={u.userId} className="border-b">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.documents.length}</td>
              <td className="p-2">
                <button onClick={() => review.mutate({ userId: u.userId, status: "verified" })}
                        className="px-3 py-1 bg-green-600 text-white rounded mr-2">
                  Approve
                </button>
                <button onClick={() => review.mutate({ userId: u.userId, status: "rejected", reviewNote: "Invalid docs" })}
                        className="px-3 py-1 bg-red-600 text-white rounded">
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
