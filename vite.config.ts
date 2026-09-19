import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, type PreviewServer, type ViteDevServer } from "vite";
import { handleApiRequest, readBody } from "./src/server/http.ts";

function pastepilotApiPlugin() {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const method = req.method ?? "GET";
      const contentType = String(req.headers["content-type"] ?? "");
      const url = req.url ?? "/";
      const pathOnly = url.split("?")[0] ?? "/";
      if (
        pathOnly !== "/share" &&
        pathOnly !== "/api/decide" &&
        pathOnly !== "/api/save" &&
        pathOnly !== "/api/export" &&
        pathOnly !== "/health"
      ) {
        next();
        return;
      }

      const finish = (body: string) => {
        void handleApiRequest({ method, url, contentType, body })
          .then((mapped) => {
            if (!mapped) {
              next();
              return;
            }
            res.statusCode = mapped.status;
            for (const [key, value] of Object.entries(mapped.headers)) {
              res.setHeader(key, value);
            }
            res.end(mapped.body);
          })
          .catch(next);
      };

      if (method === "POST") {
        void readBody(req).then(finish).catch(next);
        return;
      }
      finish("");
    });
  };

  return {
    name: "pastepilot-api",
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
  plugins: [react(), pastepilotApiPlugin()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
