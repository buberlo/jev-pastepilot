import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { shareAppUrl } from "../domain/share";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SECRETISH = /sk-[a-zA-Z0-9]{8,}|TYPESAFE_API_KEY\s*=\s*['\"](?!\$)[^'\"]+/;

describe("Mac Settings source", () => {
  it("ships a SwiftUI Settings window that uses Keychain, not project files", async () => {
    const root = path.join(repoRoot, "macos/PastePilotService");
    const view = await readFile(path.join(root, "SettingsView.swift"), "utf8");
    const keychain = await readFile(path.join(root, "KeychainStore.swift"), "utf8");
    const builder = await readFile(path.join(root, "ShareURLBuilder.swift"), "utf8");
    const app = await readFile(path.join(root, "PastePilotApp.swift"), "utf8");
    const web = await readFile(path.join(root, "MainWebView.swift"), "utf8");
    const settings = await readFile(path.join(root, "AppSettings.swift"), "utf8");
    const server = await readFile(path.join(root, "LocalServer.swift"), "utf8");
    const actions = await readFile(path.join(root, "MacActions.swift"), "utf8");
    const service = await readFile(path.join(root, "ServiceProvider.swift"), "utf8");
    const build = await readFile(path.join(root, "build.sh"), "utf8");
    const pkg = await readFile(path.join(root, "Package.swift"), "utf8");

    expect(view).toContain("SecureField");
    expect(view).toContain("SettingsView");
    expect(view).toContain("preferredBrowser");
    expect(view).toContain("shortcutName");
    expect(view).toContain("shortcuts://run-shortcut");
    expect(app).toContain("WindowGroup(\"PastePilot\")");
    expect(app).toContain("Settings");
    expect(web).toContain("WKWebView");
    expect(web).toContain("WKScriptMessageHandlerWithReply");
    expect(web).toContain("macAction");
    expect(web).toContain("MacActions.handle");
    expect(web).toContain("mailto");
    expect(web).toContain("dict");
    expect(web).toContain("shortcuts");
    expect(actions).toContain("NSWorkspace");
    expect(actions).toContain("NSAppleScript");
    expect(actions).toContain("NSSpeechSynthesizer");
    expect(actions).toContain("safeFileURL");
    expect(actions).toContain("com.apple.Terminal");
    expect(actions).not.toMatch(/print\(|NSLog\(|os_log/);
    expect(actions).not.toMatch(SECRETISH);
    expect(build).toContain("MacActions.swift");
    expect(pkg).toContain("MacActions.swift");
    expect(settings).toContain("preferredBrowser");
    expect(settings).toContain("shortcutName");
    expect(server).toContain("PASTEPILOT_PREFERRED_BROWSER");
    expect(server).toContain("PASTEPILOT_SHORTCUT_NAME");
    expect(server).toContain("PASTEPILOT_NATIVE_MAC");
    expect(server).toContain("TYPESAFE_API_KEY");
    expect(server).toContain("PASTEPILOT_READY");
    expect(server).toContain("127.0.0.1");
    expect(server).not.toMatch(/print\(|NSLog\(|os_log/);
    expect(service).toContain("IngestStore.shared.ingest");
    expect(service).not.toContain("NSWorkspace.shared.open");
    expect(keychain).toContain("local.pastepilot.typesafe");
    expect(keychain).toContain("kSecClassGenericPassword");
    expect(builder).toContain("Never puts TYPESAFE_API_KEY");
    expect(builder).toContain("pastepilot");
    expect(builder).not.toMatch(/queryItem\(name: \"(key|apiKey|TYPESAFE_API_KEY)\"/i);
    expect(view).not.toMatch(SECRETISH);
    expect(keychain).not.toMatch(SECRETISH);
    expect(server).not.toMatch(SECRETISH);
  });

  it("keeps a layout preview for Linux screenshots", async () => {
    const preview = path.join(repoRoot, "macos/settings-preview.html");
    expect((await stat(preview)).isFile()).toBe(true);
    const html = await readFile(preview, "utf8");
    expect(html).toContain("PastePilot Settings");
    expect(html).toContain("Preferred browser");
    expect(html).toContain("Shortcut");
    expect(html).toContain("local.pastepilot.typesafe");
    expect(html).toContain("Layout preview");
    expect(html).not.toMatch(SECRETISH);
  });
});

describe("share helper reads Settings without leaking the key", () => {
  it("adds provider=jev to the ingest URL and never a key", async () => {
    const { stdout } = await execFileAsync(
      "bash",
      [path.join(repoRoot, "macos/share-to-pastepilot.sh"), "--print-url", "hello world"],
      {
        env: {
          ...process.env,
          PASTEPILOT_URL: "http://localhost:5173",
          PASTEPILOT_PROVIDER: "jev",
        },
      },
    );
    expect(stdout.trim()).toBe("http://localhost:5173/?provider=jev&text=hello%20world");
    expect(stdout).not.toMatch(/TYPESAFE|api[_-]?key|sk-/i);
    expect(shareAppUrl("hello world", "http://localhost:5173", { provider: "jev" })).toBe(
      "http://localhost:5173/?provider=jev&text=hello+world",
    );
  });

  it("run-dev-with-keychain.sh never echoes the key", async () => {
    const script = await readFile(path.join(repoRoot, "macos/run-dev-with-keychain.sh"), "utf8");
    expect(script).toContain("local.pastepilot.typesafe");
    expect(script).toContain("Never prints TYPESAFE_API_KEY");
    expect(script).not.toMatch(/echo\s+"\$\{?TYPESAFE_API_KEY/);
    expect(script).not.toMatch(/printf.*\$\{?TYPESAFE_API_KEY/);
    expect(script).not.toMatch(SECRETISH);
  });

  it("opens the Mac app scheme instead of a browser by default", async () => {
    const script = await readFile(path.join(repoRoot, "macos/share-to-pastepilot.sh"), "utf8");
    expect(script).toContain("pastepilot://ingest");
    expect(script).toContain("--web");
    expect(script).not.toMatch(SECRETISH);
  });
});
