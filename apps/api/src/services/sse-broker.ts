import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
}

class SSEBroker {
  private clients: Map<string, Client> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Ping all connected clients every 30 seconds to prevent connection drops by proxies (like Nginx/Cloudflare)
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('ping', { timestamp: Date.now() });
    }, 30000);
  }

  public addClient(id: string, res: Response) {
    this.clients.set(id, res);
    console.log(`[SSEBroker] Client connected: ${id}. Active clients: ${this.clients.size}`);
  }

  public removeClient(id: string) {
    this.clients.delete(id);
    console.log(`[SSEBroker] Client disconnected: ${id}. Active clients: ${this.clients.size}`);
  }

  public broadcast(event: string, payload: any) {
    const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(dataString);
      } catch (error) {
        console.warn(`[SSEBroker] Failed to write to client ${id}. Removing.`);
        this.removeClient(id);
      }
    }
  }
}

export const broker = new SSEBroker();
