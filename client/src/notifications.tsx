import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type Notice = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

type NotificationContextValue = {
  notify: (type: Notice["type"], message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

let idCounter = 1;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notices, setNotices] = useState<Notice[]>([]);

  const notify = useCallback((type: Notice["type"], message: string) => {
    const id = idCounter++;
    setNotices((prev) => [...prev, { id, type, message }]);
    // auto-remove after 4 seconds
    setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 1000,
        }}
      >
        {notices.map((n) => (
          <div
            key={n.id}
            style={{
              minWidth: 220,
              maxWidth: 320,
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 14,
              background:
                n.type === "success"
                  ? "#16a34a"
                  : n.type === "error"
                  ? "#dc2626"
                  : "#4b5563",
              color: "#f9fafb",
              boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
            }}
          >
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
