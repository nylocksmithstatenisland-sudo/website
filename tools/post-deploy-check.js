#!/usr/bin/env node
/**
 * Post-deploy check for locksmithstatenisland.nyc.
 *
 *   npm run check:deploy            # checks https://www.locksmithstatenisland.nyc
 *   SITE_URL=https://preview.example npm run check:deploy
 *
 * Verifies, against the live host:
 *   1. every explicit `.html -> clean URL` rule in _redirects (and the merged
 *      NYC cost post) answers with a redirect to the expected target
 *   2. key pages, the sitemap and the compiled CSS answer 200, and each page's
 *      <title> matches the file in this repo (catches a stale deploy)
 *   3. non-www and trailing-slash variants redirect
 *
 * Exit code 1 if anything fails. No dependencies (Node 18+).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = (process.env.SITE_URL || "https://www.locksmithstatenisland.nyc").replace(/\/$/, "");
const TIMEOUT_MS = 15000;

const PAGES = [
  "/", "/locksmith-near-me", "/locksmith-near-me/annadale", "/locksmith-near-me/prince-bay",
  "/locksmith-near-me/great-kills", "/locksmith-near-me/eltingville",
  "/blog/car-key-replacement-costs-staten-island", "/blog/car-lockout-costs-staten-island",
  "/blog/smart-locks-guide-staten-island",
  "/services/automotive-locksmith/car-key-replacement", "/services/key-duplication-rekeying/key-cutting",
  "/services/residential-locksmith/smart-lock-installation", "/services/emergency-locksmith/home-lockout",
  "/services/emergency-locksmith/lockout", "/services/emergency-locksmith/car-lockout",
  "/commercial-accounts", "/commercial-accounts/account-application", "/commercial-accounts/auto-dealers-fleets",
  "/services/automotive-locksmith/emergency-car-key-replacement", "/services/key-duplication-rekeying/lost-key-replacement",
];
const ASSETS = ["/sitemap.xml", "/assets/css/tailwind.min.css", "/robots.txt", "/assets/docs/vendor-packet.pdf", "/assets/docs/credit-application.pdf"];
const VARIANTS = [
  ["https://locksmithstatenisland.nyc/locksmith-near-me/prince-bay", "/locksmith-near-me/prince-bay"],
  ["https://locksmithstatenisland.nyc/services/emergency-locksmith", "/services/emergency-locksmith"],
  [SITE + "/blog/car-key-replacement-costs-staten-island/", "/blog/car-key-replacement-costs-staten-island"],
];

function redirectRules() {
  const rules = [];
  for (const line of fs.readFileSync(path.join(ROOT, "_redirects"), "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [src, dst, code] = t.split(/\s+/);
    if (!src || !dst || src.includes("*") || src.startsWith("http")) continue;
    if (/\.html$/.test(src) || src === "/blog/cost-to-replace-a-car-key-in-nyc") rules.push({ src, dst, code: code || "301" });
  }
  return rules;
}

function localTitle(p) {
  const file = p === "/" ? "index.html" : p.replace(/^\//, "") + ".html";
  const t = fs.readFileSync(path.join(ROOT, file), "utf8");
  const m = t.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim() : null;
}

async function get(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": "post-deploy-check/1.0" }, ...opts });
    const text = opts.method === "HEAD" ? "" : await res.text();
    return { status: res.status, location: res.headers.get("location"), text };
  } catch (e) {
    return { status: 0, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(timer);
  }
}

function samePath(location, expected) {
  if (!location) return false;
  try {
    const l = new URL(location, SITE);
    const e = new URL(expected, SITE);
    return l.pathname.replace(/\/$/, "") === e.pathname.replace(/\/$/, "") && (expected.startsWith("http") ? l.host === e.host : true);
  } catch (_) {
    return false;
  }
}

async function runBatches(items, fn, size = 6) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

async function main() {
  const results = [];
  const add = (group, name, ok, detail) => results.push({ group, name, ok, detail });

  const rules = redirectRules();
  await runBatches(rules, async (r) => {
    const res = await get(SITE + r.src);
    const ok = [301, 302, 307, 308].includes(res.status) && samePath(res.location, r.dst);
    add("redirect", r.src, ok, res.error || `${res.status} -> ${res.location || "(no Location)"}; expected ${r.dst}`);
  });

  await runBatches(PAGES, async (p) => {
    const res = await get(SITE + p);
    const want = localTitle(p);
    const m = res.text && res.text.match(/<title>([\s\S]*?)<\/title>/);
    const got = m ? m[1].trim() : null;
    const ok = res.status === 200 && want && got === want;
    add("page", p, ok, res.error || (res.status !== 200 ? `HTTP ${res.status}` : got === want ? "200, title matches repo" : `title mismatch: live "${got}" vs repo "${want}"`));
  });

  await runBatches(ASSETS, async (a) => {
    const res = await get(SITE + a);
    add("asset", a, res.status === 200, res.error || `HTTP ${res.status}`);
  });

  await runBatches(VARIANTS, async ([url, target]) => {
    const res = await get(url);
    const ok = [301, 302, 307, 308].includes(res.status) && samePath(res.location, SITE + target);
    add("variant", url, ok, res.error || `${res.status} -> ${res.location || "(no Location)"}; expected ${target}`);
  });

  const failed = results.filter((r) => !r.ok);
  const w = Math.max(...results.map((r) => r.name.length));
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.group.padEnd(8)} ${r.name.padEnd(w)}  ${r.detail}`);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed against ${SITE}`);
  process.exit(failed.length ? 1 : 0);
}

main();
