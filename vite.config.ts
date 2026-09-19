import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { handleShareRequest } from "./src/domain/share";

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

export default defineConfig({
  plugins: [react(), shareTargetPlugin()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
