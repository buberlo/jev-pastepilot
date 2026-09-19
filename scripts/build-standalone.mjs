import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(root, "macos/PastePilotService/bundled/server.mjs");

await mkdir(path.dirname(outfile), { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/server/standalone.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile,
  logLevel: "info",
  legalComments: "none",
  packages: "bundle",
});

console.log(`Wrote ${path.relative(root, outfile)}`);
