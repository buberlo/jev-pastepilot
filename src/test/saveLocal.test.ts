import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { confirmExecution } from "../domain/execute";
import { buildPreview } from "../domain/preview";
import {
  buildLocalSaveEntry,
  countInboxEntries,
  formatInboxMarkdown,
  isLocalSaveTool,
} from "../domain/saveLocal";
import { runExport } from "../server/export";
import { appendLocalSave, runSave } from "../server/save";

describe("local save records", () => {
  it("builds idea, task, and note entries and rejects empty or unwired tools", () => {
    expect(isLocalSaveTool("capture_idea")).toBe(true);
    expect(isLocalSaveTool("save_markdown")).toBe(true);
    expect(isLocalSaveTool("create_checklist")).toBe(true);
    expect(isLocalSaveTool("open_url")).toBe(false);
    expect(isLocalSaveTool("draft_event")).toBe(false);
    expect(buildLocalSaveEntry("capture_idea", "  An app that kits.  ")?.text).toBe(
      "An app that kits.",
    );
    expect(buildLocalSaveEntry("draft_event", "Meet tomorrow")).toBeNull();
    expect(buildLocalSaveEntry("capture_task", "   ")).toBeNull();
  });

  it("formats markdown the inbox can append", () => {
    const entry = {
      toolId: "capture_idea" as const,
      text: "An app that lets me assemble virtual model kits.",
      savedAt: "2026-09-19T19:48:00.000Z",
    };
    const block = formatInboxMarkdown(entry);
    expect(block).toContain("## Idea — 2026-09-19T19:48:00.000Z");
    expect(block).toContain("An app that lets me assemble virtual model kits.");
    expect(countInboxEntries(`${block}${block}`)).toBe(2);
  });
});

describe("save execution gate", () => {
  const idea = "An app that lets me assemble virtual model kits.";

  it("does not save without Confirm or on a stale version", () => {
    const preview = buildPreview("capture_idea", idea, "v1");
    expect(
      confirmExecution({ preview, currentStateVersion: "v1", confirmed: false, input: idea }).ok,
    ).toBe(false);
    expect(
      confirmExecution({ preview, currentStateVersion: "v9", confirmed: true, input: idea }).reason,
    ).toBe("stale");
  });

  it("returns a save_local effect after Confirm", () => {
    const preview = buildPreview("capture_task", "TODO: write the quarterly report", "v1");
    const result = confirmExecution({
      preview,
      currentStateVersion: "v1",
      confirmed: true,
      input: "TODO: write the quarterly report",
    });
    expect(result.ok).toBe(true);
    expect(result.effect?.type).toBe("save_local");
    expect(result.effect?.entry).toMatchObject({
      toolId: "capture_task",
      text: "TODO: write the quarterly report",
    });
  });
});

describe("server inbox append", () => {
  it("appends markdown under the data dir and never treats Confirm as optional", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "pastepilot-inbox-"));
    const first = await appendLocalSave("capture_idea", "First idea", {
      dataDir,
      savedAt: "2026-09-19T19:00:00.000Z",
    });
    const second = await appendLocalSave("capture_task", "TODO: follow up", {
      dataDir,
      savedAt: "2026-09-19T19:01:00.000Z",
    });
    expect(first).toMatchObject({ count: 1 });
    expect(second).toMatchObject({ count: 2 });
    if ("path" in first && "path" in second) {
      expect(first.path).toBe(path.join(dataDir, "inbox.md"));
      const body = await readFile(first.path, "utf8");
      expect(body).toContain("## Idea — 2026-09-19T19:00:00.000Z");
      expect(body).toContain("First idea");
      expect(body).toContain("## Task — 2026-09-19T19:01:00.000Z");
      expect(body).toContain("TODO: follow up");
    }
  });

  it("rejects unwired tools and empty text", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "pastepilot-inbox-"));
    expect(await appendLocalSave("draft_event", "Meet tomorrow", { dataDir })).toEqual({
      error: "unknown_tool",
    });
    expect(await appendLocalSave("capture_idea", "  ", { dataDir })).toEqual({ error: "empty" });
  });
});

describe("POST /api/save handler", () => {
  it("appends from a JSON body and rejects junk", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "pastepilot-http-"));
    const ok = await runSave(
      JSON.stringify({ toolId: "save_note", text: "The garden is quieter after rain." }),
      { dataDir },
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ok: true, count: 1 });
    expect(await runSave("{", { dataDir })).toEqual({
      status: 400,
      body: { error: "malformed" },
    });
    expect(await runSave(JSON.stringify({ toolId: "open_url", text: "https://example.com" }), { dataDir })).toEqual({
      status: 400,
      body: { error: "unknown_tool" },
    });
  });
});

describe("POST /api/export handler", () => {
  it("writes an allowlisted filename and rejects path tricks", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "pastepilot-export-"));
    const ok = await runExport(
      JSON.stringify({ filename: "pastepilot-draft.ics", content: "BEGIN:VCALENDAR\nEND:VCALENDAR\n" }),
      { dataDir },
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ok: true });
    expect(await runExport(JSON.stringify({ filename: "../secret.ics", content: "x" }), { dataDir })).toEqual({
      status: 400,
      body: { error: "bad_filename" },
    });
    expect(await runExport(JSON.stringify({ filename: "pastepilot.exe", content: "x" }), { dataDir })).toEqual({
      status: 400,
      body: { error: "bad_filename" },
    });
  });
});
