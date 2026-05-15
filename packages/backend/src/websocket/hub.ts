import type { WsEvent } from '../types';

// Minimal interface satisfied by any ws/WebSocket instance
interface WsClient {
  readonly readyState: number;
  send(data: string): void;
}

const WS_OPEN = 1;

class WsHub {
  private readonly clients = new Set<WsClient>();

  register(ws: WsClient): void {
    this.clients.add(ws);
  }

  unregister(ws: WsClient): void {
    this.clients.delete(ws);
  }

  broadcast(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const hub = new WsHub();
