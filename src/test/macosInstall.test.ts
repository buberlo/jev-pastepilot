import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { shareAppUrl } from "../domain/share";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("macOS install artifacts", () => {
  it("ships an importable Quick Action and a double-click install script", async () => {
    const workflow = path.join(repoRoot, "macos/Send to PastePilot.workflow/Contents");
    expect((await stat(path.join(workflow, "Info.plist"))).isFile()).toBe(true);
    expect((await stat(path.join(workflow, "document.wflow"))).isFile()).toBe(true);
    expect((await stat(path.join(repoRoot, "macos/install.command"))).isFile()).toBe(true);
    const wflow = await readFile(path.join(workflow, "document.wflow"), "utf8");
    expect(wflow).toContain("pastepilot://ingest?text=");
    expect(wflow).not.toContain("http://localhost:5173/?text=");
    expect(wflow).toContain("Explicit invoke only");
    expect(wflow).toContain("Does not watch the clipboard");
  });

  it("install.command copies the workflow into ~/Library/Services", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "pastepilot-mac-"));
    await execFileAsync("bash", [path.join(repoRoot, "macos/install.command")], {
      env: { ...process.env, HOME: home },
    });
    const dest = path.join(home, "Library/Services/Send to PastePilot.workflow/Contents/document.wflow");
    expect((await stat(dest)).isFile()).toBe(true);
    expect(await readFile(dest, "utf8")).toContain("pastepilot://ingest?text=");
  });

  it("wrapper still prints the current share URL", () => {
    expect(shareAppUrl("hello world")).toBe("http://localhost:5173/?text=hello+world");
  });
});
