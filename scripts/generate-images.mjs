#!/usr/bin/env node
/**
 * Generate every homepage image via the Pixazo API and drop them into
 * public/generated/. The homepage references these files; until they exist the
 * <Img> component shows a gradient placeholder, so this can be run any time.
 *
 * Usage:
 *   PIXAZO_API_KEY=your_key npm run gen:images
 *   PIXAZO_API_KEY=your_key node scripts/generate-images.mjs --force   # re-generate all
 *
 * Env:
 *   PIXAZO_API_KEY   (required) your Pixazo subscription key
 *   PIXAZO_MODEL     (optional) default "nano-banana-2"; also supports "gpt-image-2"
 *
 * Notes:
 *   - Requires a funded Pixazo wallet (~$0.07 / image). Empty wallet -> HTTP 402.
 *   - Idempotent: skips files that already exist unless --force is passed.
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "generated");
const MANIFEST = join(__dirname, "image-manifest.json");
const IMAGE_LINKS = join(ROOT, "src", "lib", "imageLinks.json");

const API_KEY = process.env.PIXAZO_API_KEY;
const MODEL = process.env.PIXAZO_MODEL || "nano-banana-2";
const FORCE = process.argv.includes("--force");
const GATEWAY = "https://gateway.pixazo.ai";
const CONCURRENCY = 3;
const POLL_INTERVAL = 2500;
const POLL_TIMEOUT = 150_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function exists(p) {
  return access(p, constants.F_OK).then(() => true).catch(() => false);
}

function buildBody(item, cfg) {
  // nano-banana-2 and gpt-image-2 take slightly different bodies.
  if (MODEL === "gpt-image-2") {
    const sizeMap = { "4:5": "1024x1536", "3:4": "1024x1536", "4:3": "1536x1024", "1:1": "1024x1024" };
    return {
      prompt: item.prompt,
      n: 1,
      size: sizeMap[item.aspect_ratio] || "1024x1024",
      quality: "high",
      format: cfg.output_format || "jpeg",
    };
  }
  return {
    prompt: item.prompt,
    num_images: 1,
    aspect_ratio: item.aspect_ratio || "1:1",
    resolution: cfg.resolution || "1K",
    output_format: cfg.output_format || "jpeg",
  };
}

async function submit(item, cfg) {
  const res = await fetch(`${GATEWAY}/${MODEL}/v1/text-to-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": API_KEY,
    },
    body: JSON.stringify(buildBody(item, cfg)),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`submit ${res.status}: ${json.message || json.error || text}`);
  }
  return json;
}

function extractUrl(json) {
  const out = json.output || json.result || json;
  const media = out.media_url || out.image_url || out.images || out.url;
  if (Array.isArray(media)) return media[0];
  return media;
}

async function poll(job) {
  const url =
    job.polling_url ||
    (job.request_id ? `${GATEWAY}/v2/requests/status/${job.request_id}` : null);
  if (!url) throw new Error("no polling_url / request_id in response");

  const deadline = Date.now() + POLL_TIMEOUT;
  while (Date.now() < deadline) {
    const res = await fetch(url, {
      headers: { "Ocp-Apim-Subscription-Key": API_KEY, "Cache-Control": "no-cache" },
    });
    const json = await res.json().catch(() => ({}));
    const status = (json.status || "").toUpperCase();
    if (status === "COMPLETED" || status === "SUCCEEDED" || extractUrl(json)) {
      const link = extractUrl(json);
      if (link) return link;
    }
    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`job failed: ${JSON.stringify(json).slice(0, 200)}`);
    }
    await sleep(POLL_INTERVAL);
  }
  throw new Error("polling timed out");
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT_DIR, file), buf);
  return buf.length;
}

async function generate(item, cfg) {
  const target = join(OUT_DIR, item.file);
  if (!FORCE && (await exists(target))) {
    console.log(`  skip   ${item.file} (exists)`);
    return { file: item.file, skipped: true };
  }
  const submitted = await submit(item, cfg);
  const link = submitted && (submitted.status || "").toUpperCase() === "COMPLETED" && extractUrl(submitted)
    ? extractUrl(submitted)
    : await poll(submitted);
  const bytes = await download(link, item.file);
  console.log(`  ok     ${item.file} (${(bytes / 1024).toFixed(0)} KB)`);
  return { file: item.file, ok: true };
}

async function main() {
  if (!API_KEY) {
    console.error("✖ PIXAZO_API_KEY is not set.\n  Run:  PIXAZO_API_KEY=your_key npm run gen:images");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const cfg = JSON.parse(await readFile(MANIFEST, "utf8"));
  const items = cfg.images;
  console.log(`Generating ${items.length} images with "${MODEL}" -> public/generated/\n`);

  const queue = [...items];
  const failures = [];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      try {
        await generate(item, cfg);
      } catch (err) {
        console.error(`  FAIL   ${item.file}: ${err.message}`);
        failures.push({ file: item.file, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Point imageLinks.json at every image that now exists locally, so the
  // homepage serves the generated files instead of the temporary stock URLs.
  await repointImageLinks(items);

  console.log(`\nDone. ${failures.length ? `${failures.length} failed.` : "All good."}`);
  if (failures.length) process.exit(1);
}

async function repointImageLinks(items) {
  let links;
  try {
    links = JSON.parse(await readFile(IMAGE_LINKS, "utf8"));
  } catch {
    return; // no links file — nothing to repoint
  }
  let changed = 0;
  for (const item of items) {
    const key = item.file.replace(/\.[^.]+$/, "");
    if ((await exists(join(OUT_DIR, item.file))) && key in links) {
      const local = `/generated/${item.file}`;
      if (links[key] !== local) {
        links[key] = local;
        changed++;
      }
    }
  }
  if (changed) {
    await writeFile(IMAGE_LINKS, JSON.stringify(links, null, 2) + "\n");
    console.log(`\nRepointed ${changed} entr${changed === 1 ? "y" : "ies"} in src/lib/imageLinks.json -> /generated/*`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
