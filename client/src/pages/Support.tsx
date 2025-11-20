import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";

export default function Support() {
  const { notify } = useNotifications();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const createTicket = trpc.support.createTicket.useMutation();
  const myTickets = trpc.support.myTickets.useQuery();

  return (
    <div>
      <h2>Support</h2>
      <div style={{ maxWidth: 400, display: "grid", gap: 8 }}>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
        />
        <button
          onClick={() => {
            createTicket.mutate({ subject, message }, {
              onSuccess() { notify("success", "Support ticket opened"); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Open Ticket
        </button>
      </div>

      <h3>My Tickets</h3>
      <ul>
        {myTickets.data?.map((t: any) => (
          <li key={t.id}>
            #{t.id} [{t.status}] {t.subject}
          </li>
        ))}
      </ul>
    </div>
  );
}
