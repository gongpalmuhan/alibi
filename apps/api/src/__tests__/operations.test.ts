import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app";
import { createGracefulShutdown } from "../lib/shutdown";

type HttpResponse = {
  status: number;
  body: unknown;
};

type HandleableApp = {
  handle: (request: unknown, response: unknown, next: (error?: unknown) => void) => void;
};

const request = async (
  app: ReturnType<typeof createApp>,
  url: string,
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const headers = new Map<string, string | number | readonly string[]>();
    const response = {
      statusCode: 200,
      headersSent: false,
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      setHeader: (name: string, value: string | number | readonly string[]) => {
        headers.set(name.toLowerCase(), value);
      },
      removeHeader: (name: string) => {
        headers.delete(name.toLowerCase());
      },
      end(body?: string | Buffer) {
        this.headersSent = true;
        resolve({
          status: this.statusCode,
          body: body ? JSON.parse(body.toString()) : undefined,
        });
        return this;
      },
    };
    const incomingRequest = {
      method: "GET",
      url,
      originalUrl: url,
      headers: {},
    };

    (app as unknown as HandleableApp).handle(incomingRequest, response, reject);
  });

describe("operational endpoints", () => {
  it("keeps liveness independent from readiness", async () => {
    const checkReadiness = vi.fn().mockRejectedValue(
      new Error("postgresql://sensitive-user:sensitive-password@db.example/alibi"),
    );
    const app = createApp({ checkReadiness });

    expect(await request(app, "/health")).toEqual({
      status: 200,
      body: { status: "ok" },
    });

    const ready = await request(app, "/ready");
    expect(ready).toEqual({ status: 503, body: { status: "unavailable" } });
    expect(JSON.stringify(ready.body)).not.toContain("sensitive");
    expect(checkReadiness).toHaveBeenCalledTimes(1);
  });

  it("reports readiness only after a successful database check", async () => {
    const checkReadiness = vi.fn().mockResolvedValue(undefined);
    const app = createApp({ checkReadiness });

    expect(await request(app, "/ready")).toEqual({
      status: 200,
      body: { status: "ready" },
    });
    expect(checkReadiness).toHaveBeenCalledTimes(1);
  });
});

describe("graceful shutdown", () => {
  it("closes HTTP intake before disconnecting Prisma and runs only once", async () => {
    const events: string[] = [];
    const server = {
      close: (callback: (error?: Error) => void) => {
        events.push("close");
        callback();
      },
    };
    const disconnect = vi.fn(async () => {
      events.push("disconnect");
    });
    const shutdown = createGracefulShutdown({ server, disconnect });

    await Promise.all([shutdown(), shutdown(), shutdown()]);

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["close", "disconnect"]);
  });
});
