import { Response } from 'express';

interface Client {
  res: Response;
  deviceId: string | null;
}

const clients = new Set<Client>();
let heartbeat: NodeJS.Timeout | null = null;

const write = (c: Client, chunk: string) => {
  try {
    c.res.write(chunk);
  } catch {
    clients.delete(c);
  }
};

/** Server-Sent Events hub. Events: snapshot | reading | actuators | alert | log | device | settings */
export const realtime = {
  add(res: Response, deviceId: string | null) {
    const client: Client = { res, deviceId };
    clients.add(client);
    if (!heartbeat) {
      heartbeat = setInterval(() => {
        for (const c of clients) write(c, `: ping ${Date.now()}\n\n`);
      }, 25_000);
      heartbeat.unref();
    }
    return client;
  },

  remove(client: Client) {
    clients.delete(client);
    if (clients.size === 0 && heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  },

  send(client: Client, event: string, data: unknown) {
    write(client, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  },

  publish(event: string, data: unknown, deviceId?: string | null) {
    if (clients.size === 0) return;
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) {
      if (!deviceId || !c.deviceId || c.deviceId === deviceId) write(c, chunk);
    }
  },

  clientCount: () => clients.size,
};
