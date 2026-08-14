import { io, type Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api/client";

let socket: Socket | null = null;

/** Lazy singleton — cookies are sent via `withCredentials` (matches backend cors). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    if (process.env.NODE_ENV !== "production") {
      socket.on("connect", () => {
        console.debug("[socket] connected", socket?.id);
      });
      socket.on("connect_error", (error) => {
        console.warn("[socket] connect_error", error.message);
      });
      socket.on("disconnect", (reason) => {
        console.debug("[socket] disconnect", reason);
      });
    }
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  // Keep `on(...)` subscriptions — components own those via useSocketEvent.
  socket?.disconnect();
}
