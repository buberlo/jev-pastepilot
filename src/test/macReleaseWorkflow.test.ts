import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("Mac release workflow", () => {
  it("builds on macos-latest via build.sh and publishes a zip, without the API key", async () => {
    const workflowPath = path.join(repoRoot, ".github/workflows/mac-release.yml");
    expect((await stat(workflowPath)).isFile()).toBe(true);
    const workflow = await readFile(workflowPath, "utf8");
    const buildScript = await readFile(
      path.join(repoRoot, "macos/PastePilotService/build.sh"),
      "utf8",
    );

    expect(workflow).toContain("runs-on: macos-latest");
    expect(workflow).toContain("./macos/PastePilotService/build.sh");
    expect(workflow).toContain("./macos/bundle-web.sh");
    expect(workflow).toContain("./macos/PastePilotService/bundle-runtime.sh");
    expect(workflow).toContain("npm ci");
    expect(buildScript).toContain("PastePilot.app");
    expect(buildScript).toContain("Resources/web");
    expect(buildScript).toContain("Resources/server/server.mjs");
    expect(buildScript).toContain("Resources/runtime/node");
    expect(workflow).toContain("Contents/Resources/web/index.html");
    expect(workflow).toContain("Contents/Resources/runtime/node");
    expect(workflow).toContain("softprops/action-gh-release");
    expect(workflow).toContain("PastePilot-mac.zip");
    expect(workflow).toContain("mac-latest");
    expect(workflow).toContain("tags: ['v*']");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).toContain("publish");
    expect(workflow).toContain("dry-run");
    expect(workflow).toContain("codesign --force --deep --sign -");
    expect(workflow).not.toMatch(/secrets\.TYPESAFE/);
    expect(workflow).not.toMatch(/\$\{\{\s*secrets\./);
  });

  it("documents the download and Gatekeeper right-click open", async () => {
    const rootReadme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const macReadme = await readFile(path.join(repoRoot, "macos/README.md"), "utf8");

    expect(rootReadme).toContain("github.com/buberlo/jev-pastepilot/releases");
    expect(rootReadme).toContain("mac-latest");
    expect(rootReadme).toContain("right-click");
    expect(rootReadme).toContain("not notarized");
    expect(rootReadme).toContain("npm run dev");
    expect(macReadme).toContain("Download (GitHub Releases)");
    expect(macReadme).toContain("Right-click");
    expect(macReadme).toContain("Gatekeeper");
    expect(macReadme).toContain("Dry-run the workflow");
    expect(macReadme).toContain("bundled");
    expect(macReadme).toContain("WKWebView");
    expect(macReadme).not.toMatch(/TYPESAFE_API_KEY\s*=\s*['"](?!\$)[^'"]+/);
  });
});
