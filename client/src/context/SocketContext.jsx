/**
 * context/SocketContext.jsx — Real-time Socket.io Connection
 *
 * Establishes Socket.io connection when user is logged in.
 * Listens for server-emitted events:
 * - "analysis:complete" → updates journal entry in UI without page refresh
 * - "crisis:detected" → shows crisis resources modal immediately
 * - "analysis:error" → shows error toast
 */

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [crisisAlert, setCrisisAlert] = useState(null); // Active crisis event

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: {
        token: document.cookie.match(/token=([^;]+)/)?.[1] || "",
      },
      transports: ["websocket"],
    });

    s.on("connect", () => console.log("🔌 Socket connected"));
    s.on("disconnect", () => console.log("❌ Socket disconnected"));

    s.on("crisis:detected", (data) => {
      setCrisisAlert(data); // Triggers crisis modal
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const dismissCrisis = () => {
    if (socket && crisisAlert) {
      socket.emit("crisis:acknowledged", { severity: crisisAlert.severity });
    }
    setCrisisAlert(null);
  };

  return (
    <SocketContext.Provider value={{ socket, crisisAlert, dismissCrisis }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
