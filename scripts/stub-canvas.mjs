// jsdom (pulled in by fabric's Node build target, via `optionalDependencies`) does a
// guarded `require("canvas")` to support server-side <canvas> rendering. This app only
// ever loads fabric in the browser (see CLAUDE.md), so the real native "canvas" module
// is never actually invoked — but it's never installed either (npm skips materializing
// optional peer deps that nothing hard-requires), which leaves `require("canvas")"
// unresolved. That's fine for Node's own runtime `require`, but the Cloudflare/OpenNext
// esbuild bundling pass resolves the whole server bundle statically and hard-fails when
// it can't find the module on disk. Placing an empty stub at node_modules/canvas gives
// esbuild something to resolve without needing the real native (Cairo-backed) package.
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "stubs", "canvas");
const dest = join(root, "node_modules", "canvas");

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(src, "package.json"), join(dest, "package.json"));
  copyFileSync(join(src, "index.js"), join(dest, "index.js"));
}
