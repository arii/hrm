// File: hooks/useSocket.ts
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { UnifiedStateMessage } from "../types/websocket";

interface SocketContextType {
  socket: WebSocket | null;
  unifiedState: UnifiedStateMessage | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  unifiedState: null,
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [unifiedState, setUnifiedState] = useState<UnifiedStateMessage | null>(null);

  useEffect(() => {
    if (user && user.encryptedRefreshToken) {
      const ws = new WebSocket(`ws://${window.location.host}/ws`);

      ws.onopen = () => {
        setSocket(ws);
        ws.send(
          JSON.stringify({
            type: "IDENTIFY",
            userId: user.id,
            encryptedRefreshToken: user.encryptedRefreshToken,
          })
        );
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "STATE_UPDATE") {
          setUnifiedState(message);
        }
      };

      ws.onclose = () => {
        setSocket(null);
      };

      return () => {
        ws.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, unifiedState }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
