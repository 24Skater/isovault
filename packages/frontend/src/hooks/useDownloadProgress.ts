import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  WsDownloadProgressEvent,
  WsVersionDetectedEvent,
  WsEvent,
} from '../api/downloads';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressMap {
  [jobId: string]: WsDownloadProgressEvent;
}

interface UseDownloadProgressOptions {
  onProgress?: (event: WsDownloadProgressEvent) => void;
  onCompleted?: (jobId: string, versionId: string) => void;
  onFailed?: (jobId: string, errorMessage: string) => void;
  onVersionDetected?: (event: WsVersionDetectedEvent) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDownloadProgress({
  onProgress,
  onCompleted,
  onFailed,
  onVersionDetected,
}: UseDownloadProgressOptions): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Keep callbacks in a ref so the connect closure always sees the latest version
  const callbacksRef = useRef({ onProgress, onCompleted, onFailed, onVersionDetected });
  useEffect(() => {
    callbacksRef.current = { onProgress, onCompleted, onFailed, onVersionDetected };
  });

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WsEvent;
        const cbs = callbacksRef.current;

        if (msg.type === 'download.progress') {
          cbs.onProgress?.(msg);
        } else if (msg.type === 'download.completed') {
          cbs.onCompleted?.(msg.jobId, msg.versionId);
        } else if (msg.type === 'download.failed') {
          cbs.onFailed?.(msg.jobId, msg.errorMessage);
        } else if (msg.type === 'version.detected') {
          cbs.onVersionDetected?.(msg);
        }
      } catch {
        // malformed message — ignore
      }
    };

    ws.onerror = () => {
      // onclose fires next, which handles reconnect
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}
