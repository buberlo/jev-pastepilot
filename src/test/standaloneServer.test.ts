import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handleApiRequest } from "../server/http";
import { BUNDLED_PORT, listenStandalone } from "../server/standalone";

const SECRETISH = /TYPESAFE_API_KEY\s*=\s*['"](?!\$)[^'"]+/;

describe("standalone HTTP API", () => {
  it("serves health without leaking configuration", async () => {
    const health = await handleApiRequest({ method: "GET", url: "/health" });
    expect(health).toEqual({
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: true }),
    });
    expect(health?.body).not.toMatch(/TYPESAFE|api[_-]?key|sk-/i);
  });

  it("maps /share onto /?text= and rejects an unreadable POST", async () => {
    expect(
      await handleApiRequest({
        method: "GET",
        url: "/share?text=Service%20failed",
      }),
    ).toEqual({
      status: 302,
      headers: { Location: "/?text=Service+failed" },
      body: "",
    });
    expect(
      await handleApiRequest({
        method: "POST",
        url: "/share",
        contentType: "application/json",
        body: "{",
      }),
    ).toMatchObject({ status: 400 });
  });

  it("fail-opens /api/decide when no key is configured", async () => {
    const result = await handleApiRequest({
      method: "POST",
      url: "/api/decide",
      contentType: "application/json",
      body: JSON.stringify({
        requestId: "req-1",
        stateVersion: "state-1",
        input: "Service failed: connection refused on the database socket.",
        context: {},
        candidates: [{ id: "open_log_viewer", description: "Open log viewer" }],
      }),
    });
    expect(result?.status).toBe(503);
    expect(result?.body).toBe(JSON.stringify({ error: "not_configured" }));
    expect(result?.body).not.toMatch(SECRETISH);
  });

  it("leaves unknown paths to the static handler", async () => {
    expect(await handleApiRequest({ method: "GET", url: "/" })).toBeNull();
  });
});

describe("standalone listener", () => {
  it("binds loopback only, serves the UI, and saves locally", async () => {
    const webRoot = await mkdtemp(path.join(os.tmpdir(), "pastepilot-web-"));
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "pastepilot-data-"));
    await writeFile(path.join(webRoot, "index.html"), "<!doctype html><title>PastePilot</title>", "utf8");
    const previous = process.env.PASTEPILOT_DATA_DIR;
    process.env.PASTEPILOT_DATA_DIR = dataDir;

    await expect(
      listenStandalone({ host: "0.0.0.0", port: 0, webRoot }),
    ).rejects.toThrow("bind_not_loopback");

    const running = await listenStandalone({ host: "127.0.0.1", port: 0, webRoot });
    expect(running.url).toBe(`http://127.0.0.1:${running.port}`);
    expect(running.port).toBeGreaterThan(0);
    expect(BUNDLED_PORT).toBe(18763);

    try {
      const page = await fetch(`${running.url}/`);
      expect(page.ok).toBe(true);
      expect(await page.text()).toContain("PastePilot");

      const health = await fetch(`${running.url}/health`);
      expect(await health.json()).toEqual({ ok: true });

      const traversal = await fetch(`${running.url}/../../../../etc/passwd`);
      expect(traversal.status).toBe(404);

      const saved = await fetch(`${running.url}/api/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: "capture_idea",
          text: "An app that lets me assemble virtual model kits.",
        }),
      });
      expect(saved.ok).toBe(true);
      const body = (await saved.json()) as { path?: string; count?: number };
      expect(body.count).toBe(1);
      expect(body.path).toContain(dataDir);

      const mac = await fetch(`${running.url}/api/mac`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: "speak_text", text: "hello" }),
      });
      expect(mac.ok).toBe(true);
      const macBody = (await mac.json()) as { used?: string; message?: string };
      expect(macBody.used).toBe("fallback");
      expect(macBody.message).toMatch(/Mac-only|say/i);
      expect(JSON.stringify(macBody)).not.toMatch(/TYPESAFE|sk-/);

      const exported = await fetch(`${running.url}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "pastepilot.json",
          content: '{\n  "ok": true\n}\n',
        }),
      });
      expect(exported.ok).toBe(true);
      const exportedBody = (await exported.json()) as { path?: string };
      expect(exportedBody.path).toContain(dataDir);
      expect(exportedBody.path).toContain("pastepilot.json");
    } finally {
      await running.close();
      if (previous === undefined) {
        delete process.env.PASTEPILOT_DATA_DIR;
      } else {
        process.env.PASTEPILOT_DATA_DIR = previous;
      }
    }
  });
});
