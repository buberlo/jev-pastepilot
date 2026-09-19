import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { handleApiRequest, readBody } from "./http.ts";

export const BUNDLED_PORT = 18763;
export const BUNDLED_ORIGIN = `http://127.0.0.1:${BUNDLED_PORT}`;

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

export type StandaloneOptions = {
  host?: string;
  port?: number;
  webRoot: string;
};

export type RunningServer = {
  url: string;
  host: string;
  port: number;
  server: Server;
  close: () => Promise<void>;
};

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function resolveSafeFile(webRoot: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split("?")[0] ?? "/");
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const root = path.resolve(webRoot);
  const candidate = path.resolve(root, relative);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(prefix)) {
    return null;
  }
  return candidate;
}

async function sendFile(res: ServerResponse, filePath: string): Promise<void> {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }
  if (!info.isFile()) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  res.setHeader("Content-Length", String(info.size));
  createReadStream(filePath).pipe(res);
}

function writeApi(res: ServerResponse, mapped: { status: number; headers: Record<string, string>; body: string }) {
  res.statusCode = mapped.status;
  for (const [key, value] of Object.entries(mapped.headers)) {
    res.setHeader(key, value);
  }
  res.end(mapped.body);
}

export function createStandaloneHandler(webRoot: string) {
  return (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";
    const contentType = String(req.headers["content-type"] ?? "");

    const finish = (body: string) => {
      void handleApiRequest({ method, url, contentType, body })
        .then((mapped) => {
          if (mapped) {
            writeApi(res, mapped);
            return;
          }
          if (method !== "GET" && method !== "HEAD") {
            res.statusCode = 405;
            res.end();
            return;
          }
          const filePath = resolveSafeFile(webRoot, url);
          if (!filePath) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }
          void sendFile(res, filePath);
        })
        .catch(() => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Server error");
          }
        });
    };

    if (method === "POST") {
      void readBody(req).then(finish).catch(() => {
        res.statusCode = 400;
        res.end();
      });
      return;
    }
    finish("");
  };
}

function listen(host: string, port: number, webRoot: string): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(createStandaloneHandler(webRoot));
    const onError = (error: NodeJS.ErrnoException) => {
      server.off("error", onError);
      reject(error);
    };
    server.on("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("listen_failed"));
        return;
      }
      const boundHost = address.address === "::1" ? "127.0.0.1" : address.address;
      const url = `http://${boundHost}:${address.port}`;
      resolve({
        url,
        host: boundHost,
        port: address.port,
        server,
        close: () =>
          new Promise((done, fail) => {
            server.close((closeError) => {
              if (closeError) {
                fail(closeError);
                return;
              }
              done();
            });
          }),
      });
    });
  });
}

export async function listenStandalone(options: StandaloneOptions): Promise<RunningServer> {
  const host = (options.host ?? "127.0.0.1").trim() || "127.0.0.1";
  if (!isLoopback(host)) {
    throw new Error("bind_not_loopback");
  }
  const bindHost = host === "localhost" ? "127.0.0.1" : host;
  const requested = options.port ?? BUNDLED_PORT;
  const webRoot = path.resolve(options.webRoot);
  try {
    return await listen(bindHost, requested, webRoot);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (requested !== 0 && code === "EADDRINUSE") {
      return listen(bindHost, 0, webRoot);
    }
    throw error;
  }
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<RunningServer> {
  const webRoot = env.PASTEPILOT_WEB_ROOT?.trim();
  if (!webRoot) {
    console.error("PASTEPILOT_WEB_ROOT is required.");
    throw new Error("missing_web_root");
  }
  const host = env.PASTEPILOT_HOST?.trim() || "127.0.0.1";
  const portRaw = env.PASTEPILOT_PORT?.trim();
  const port = portRaw ? Number(portRaw) : BUNDLED_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error("PASTEPILOT_PORT must be an integer 0–65535.");
    throw new Error("bad_port");
  }
  const running = await listenStandalone({ host, port, webRoot });
  process.stdout.write(`PASTEPILOT_READY ${running.url}\n`);
  return running;
}

function launchedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  const base = path.basename(entry);
  return base === "server.mjs" || base === "standalone.ts" || base === "standalone.js";
}

if (launchedAsCli()) {
  const running = await main();
  const shutdown = () => {
    void running.close().finally(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
