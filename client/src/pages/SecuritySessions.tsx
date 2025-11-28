
import React from "react";
import { trpc } from "../trpc";

export default function SecuritySessions() {
  const { data, refetch } = trpc.auth.sessionsList.useQuery();
  const revoke = trpc.auth.sessionsRevoke.useMutation();
  const revokeOthers = trpc.auth.sessionsRevokeOthers.useMutation();

  if (!data) return <div>Loading sessions...</div>;

  return (
    <div>
      <h2>Active Sessions</h2>
      <button onClick={() => revokeOthers.mutate({}, { onSuccess: () => refetch() })}>
        Log out all other devices
      </button>
      <ul>
        {data.map(s => (
          <li key={s.token} style={{ marginTop: 12 }}>
            <b>{s.isCurrent ? "(Current Device)" : "Session"}</b>
            <br/>Created: {s.createdAt}
            {!s.isCurrent && (
              <button
                onClick={() =>
                  revoke.mutate({ token: s.token }, { onSuccess: () => refetch() })
                }
                style={{ marginLeft: 12 }}
              >
                revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
