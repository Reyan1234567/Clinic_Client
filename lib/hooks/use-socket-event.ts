"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribe to a Socket.IO event for as long as the component is mounted.
 * The socket must already be connected (see SocketLifecycle).
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event]);
}
