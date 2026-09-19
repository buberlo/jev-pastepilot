import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { handleShareRequest } from "./src/domain/share.ts";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function shareTargetPlugin() {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = req.url ?? "/";
      const pathOnly = url.split("?")[0];
      if (pathOnly !== "/share") {
        next();
        return;
      }

      const method = req.method ?? "GET";
      const contentType = String(req.headers["content-type"] ?? "");
      const finish = (body: string) => {
        const mapped = handleShareRequest({ method, url, contentType, body });
        if (!mapped) {
          next();
          return;
        }
        if (mapped.status === 400) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("PastePilot share target expected text, q, or url.");
          return;
        }
        res.statusCode = mapped.status;
        res.setHeader("Location", mapped.location);
        res.end();
      };

      if (method === "POST") {
        void readBody(req).then(finish).catch(next);
        return;
      }
      finish("");
    });
  };

  return {
    name: "pastepilot-share-target",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function decidePlugin() {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const pathOnly = (req.url ?? "/").split("?")[0];
      if (pathOnly !== "/api/decide") {
        next();
        return;
      }
      if ((req.method ?? "GET") !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "method_not_allowed" }));
        return;
      }

      void readBody(req)
        .then(async (body) => {
          const { runDecide } = await import("./src/server/decide.ts");
          const result = await runDecide(body);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.body));
        })
        .catch(next);
    });
  };

  return {
    name: "pastepilot-decide",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function savePlugin() {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const pathOnly = (req.url ?? "/").split("?")[0];
      if (pathOnly !== "/api/save") {
        next();
        return;
      }
      if ((req.method ?? "GET") !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "method_not_allowed" }));
        return;
      }

      void readBody(req)
        .then(async (body) => {
          const { runSave } = await import("./src/server/save.ts");
          const result = await runSave(body);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.body));
        })
        .catch(next);
    });
  };

  return {
    name: "pastepilot-save",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function pastepilotProvider(): string {
  const raw = process.env.DECISION_PROVIDER ?? process.env.PASTEPILOT_PROVIDER ?? "mock";
  return raw.trim() || "mock";
}

export default defineConfig({
  define: {
    __PASTEPILOT_PROVIDER__: JSON.stringify(pastepilotProvider()),
  },
  plugins: [react(), shareTargetPlugin(), decidePlugin(), savePlugin()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
