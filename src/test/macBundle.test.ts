import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("Mac web/server bundle", () => {
  it("builds a standalone server without embedding a key assignment", async () => {
    await execFileAsync("node", [path.join(repoRoot, "scripts/build-standalone.mjs")], {
      cwd: repoRoot,
    });
    const outfile = path.join(repoRoot, "macos/PastePilotService/bundled/server.mjs");
    expect((await stat(outfile)).isFile()).toBe(true);
    const js = await readFile(outfile, "utf8");
    expect(js).toContain("PASTEPILOT_READY");
    expect(js).toContain("127.0.0.1");
    expect(js).not.toMatch(/TYPESAFE_API_KEY\s*=\s*['"][^'"]+/);
    expect(js).not.toMatch(/sk-[a-zA-Z0-9]{12,}/);
  });
});
