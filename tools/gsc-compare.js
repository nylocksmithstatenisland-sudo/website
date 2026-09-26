#!/usr/bin/env node
/**
 * Compare two Google Search Console "Performance on Search" exports.
 *
 *   node tools/gsc-compare.js --before <dir-or-zip> --after <dir-or-zip>
 *
 * Each export is the zip GSC downloads (Chart.csv, Pages.csv, Queries.csv,
 * Devices.csv, Filters.csv ...). Export both with the same filters; apply
 * Device = Mobile in GSC before exporting, because the per-page and per-query
 * files cannot be split by device afterwards.
 *
 * What it does:
 *   - drops Tuesdays from Chart.csv (weekly rank-tracker spike) and compares
 *     impressions/day, clicks/day and average position
 *   - drops the templated "... in staten island ny" queries (rank-tracker list)
 *     from Queries.csv and compares the remaining totals and top queries
 *   - compares the tracked opportunity pages and checks them against targets
 *
 * Output is Markdown on stdout. No dependencies; needs `unzip` only when a
 * .zip path is given instead of a folder.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SITE = "https://www.locksmithstatenisland.nyc";
const TRACKER_RE = / in staten island ny$/i;
const TARGET_CTR = 1.5; // percent, mobile, per tracked page
const TARGET_POS_PAGES = new Set([
  "/blog/car-key-replacement-costs-staten-island",
  "/blog/car-lockout-costs-staten-island",
]);
const TARGET_POS = 12;
const TRACKED = [
  "/blog/car-key-replacement-costs-staten-island",
  "/locksmith-near-me",
  "/",
  "/services/automotive-locksmith/car-key-replacement",
  "/blog/car-lockout-costs-staten-island",
  "/services/key-duplication-rekeying/key-cutting",
  "/services/residential-locksmith/smart-lock-installation",
  "/services/emergency-locksmith/car-lockout",
  "/locksmith-near-me/prince-bay",
  "/locksmith-near-me/great-kills",
  "/locksmith-near-me/eltingville",
  "/services/emergency-locksmith/home-lockout",
  "/services/emergency-locksmith/lockout",
  "/blog/smart-locks-guide-staten-island",
  "/locksmith-near-me/annadale",
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--before") out.before = argv[++i];
    else if (argv[i] === "--after") out.after = argv[++i];
  }
  if (!out.before || !out.after) {
    console.error("usage: node tools/gsc-compare.js --before <dir|zip> --after <dir|zip>");
    process.exit(2);
  }
  return out;
}

function readExport(src) {
  const files = {};
  const names = ["Chart.csv", "Pages.csv", "Queries.csv", "Devices.csv", "Filters.csv"];
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
    for (const n of names) {
      const p = path.join(src, n);
      files[n] = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    }
  } else if (/\.zip$/i.test(src)) {
    for (const n of names) {
      try {
        files[n] = execFileSync("unzip", ["-p", src, n], { encoding: "utf8" });
      } catch (e) {
        files[n] = "";
      }
    }
  } else {
    throw new Error("not a folder or .zip: " + src);
  }
  for (const n of ["Chart.csv", "Pages.csv", "Queries.csv"]) {
    if (!files[n]) throw new Error(`${src}: missing ${n}`);
  }
  return files;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}

const num = (s) => parseFloat(String(s).replace(/[%,]/g, "")) || 0;
const pct = (n, d) => (d ? (100 * n) / d : 0);
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

function chartStats(csv) {
  const rows = parseCsv(csv).slice(1);
  let days = 0, clicks = 0, impr = 0, posSum = 0, tueImpr = 0;
  for (const [date, c, i, , p] of rows) {
    const d = new Date(date + "T00:00:00Z");
    if (isNaN(d)) continue;
    if (d.getUTCDay() === 2) { tueImpr += num(i); continue; }
    days++; clicks += num(c); impr += num(i); posSum += num(p);
  }
  return { days, clicks, impr, tueImpr, avgPos: days ? posSum / days : 0, first: rows[0] && rows[0][0], last: rows.at(-1) && rows.at(-1)[0] };
}

function queryStats(csv) {
  const rows = parseCsv(csv).slice(1).map(([q, c, i, , p]) => ({ q, clicks: num(c), impr: num(i), pos: num(p) }));
  const tracker = rows.filter((r) => TRACKER_RE.test(r.q));
  const real = rows.filter((r) => !TRACKER_RE.test(r.q));
  const sum = (a, k) => a.reduce((s, r) => s + r[k], 0);
  return {
    real, map: new Map(real.map((r) => [r.q, r])),
    realImpr: sum(real, "impr"), realClicks: sum(real, "clicks"),
    trackerImpr: sum(tracker, "impr"), trackerCount: tracker.length,
  };
}

function pageStats(csv) {
  const rows = parseCsv(csv).slice(1).map(([u, c, i, , p]) => ({ url: u, path: u.replace(SITE, "") || "/", clicks: num(c), impr: num(i), pos: num(p) }));
  return { rows, map: new Map(rows.map((r) => [r.path, r])) };
}

function filters(csv) {
  const out = {};
  for (const [k, v] of parseCsv(csv || "").slice(1)) out[k] = v;
  return out;
}

function main() {
  const { before, after } = parseArgs(process.argv.slice(2));
  const B = readExport(before), A = readExport(after);
  const fb = filters(B["Filters.csv"]), fa = filters(A["Filters.csv"]);
  const out = [];
  out.push(`# GSC comparison: ${path.basename(before)} → ${path.basename(after)}`);
  out.push("");
  for (const [label, f] of [["before", fb], ["after", fa]]) {
    const dev = f.Device || "(all devices)";
    if (!/mobile/i.test(dev)) out.push(`> **Warning:** the ${label} export has Device = ${dev}. Real customers are on mobile and the rank tracker runs on desktop; re-export with Device = Mobile for a clean read.`);
    out.push(`- ${label}: ${Object.entries(f).map(([k, v]) => `${k} = ${v}`).join(", ") || "no Filters.csv"}`);
  }
  out.push("");

  const cb = chartStats(B["Chart.csv"]), ca = chartStats(A["Chart.csv"]);
  out.push("## Daily trend (Tuesdays excluded)");
  out.push("");
  out.push("| | before | after | change |");
  out.push("|---|---:|---:|---:|");
  out.push(`| date range | ${cb.first} to ${cb.last} | ${ca.first} to ${ca.last} | |`);
  out.push(`| days counted | ${cb.days} | ${ca.days} | |`);
  out.push(`| impressions / day | ${f1(cb.impr / cb.days)} | ${f1(ca.impr / ca.days)} | ${f1(ca.impr / ca.days - cb.impr / cb.days)} |`);
  out.push(`| clicks / day | ${f2(cb.clicks / cb.days)} | ${f2(ca.clicks / ca.days)} | ${f2(ca.clicks / ca.days - cb.clicks / cb.days)} |`);
  out.push(`| CTR | ${f2(pct(cb.clicks, cb.impr))}% | ${f2(pct(ca.clicks, ca.impr))}% | ${f2(pct(ca.clicks, ca.impr) - pct(cb.clicks, cb.impr))} pts |`);
  out.push(`| avg position | ${f1(cb.avgPos)} | ${f1(ca.avgPos)} | ${f1(ca.avgPos - cb.avgPos)} |`);
  out.push(`| Tuesday impressions dropped | ${cb.tueImpr} | ${ca.tueImpr} | |`);
  out.push("");

  const qb = queryStats(B["Queries.csv"]), qa = queryStats(A["Queries.csv"]);
  out.push("## Queries (rank-tracker cluster excluded)");
  out.push("");
  out.push("| | before | after |");
  out.push("|---|---:|---:|");
  out.push(`| excluded tracker queries | ${qb.trackerCount} (${qb.trackerImpr} impr) | ${qa.trackerCount} (${qa.trackerImpr} impr) |`);
  out.push(`| real impressions | ${qb.realImpr} | ${qa.realImpr} |`);
  out.push(`| real clicks | ${qb.realClicks} | ${qa.realClicks} |`);
  out.push(`| real CTR | ${f2(pct(qb.realClicks, qb.realImpr))}% | ${f2(pct(qa.realClicks, qa.realImpr))}% |`);
  out.push("");
  out.push("Top real queries after (by impressions):");
  out.push("");
  out.push("| Query | Impr | Clicks | Pos after | Pos before |");
  out.push("|---|---:|---:|---:|---:|");
  for (const r of [...qa.real].sort((x, y) => y.impr - x.impr).slice(0, 25)) {
    const b = qb.map.get(r.q);
    out.push(`| ${r.q} | ${r.impr} | ${r.clicks} | ${f1(r.pos)} | ${b ? f1(b.pos) : "new"} |`);
  }
  out.push("");

  const pb = pageStats(B["Pages.csv"]), pa = pageStats(A["Pages.csv"]);
  out.push("## Tracked pages");
  out.push("");
  out.push("| Page | Impr b→a | Clicks b→a | CTR b→a | Pos b→a | Target |");
  out.push("|---|---:|---:|---:|---:|---|");
  let pass = 0, fail = 0;
  for (const p of TRACKED) {
    const b = pb.map.get(p) || { impr: 0, clicks: 0, pos: 0 };
    const a = pa.map.get(p) || { impr: 0, clicks: 0, pos: 0 };
    const ctrA = pct(a.clicks, a.impr), ctrB = pct(b.clicks, b.impr);
    const checks = [];
    if (a.impr >= 20) checks.push(ctrA >= TARGET_CTR ? "CTR ok" : `CTR < ${TARGET_CTR}%`);
    if (TARGET_POS_PAGES.has(p)) checks.push(a.pos && a.pos <= TARGET_POS ? "pos ok" : `pos > ${TARGET_POS}`);
    const ok = checks.length && checks.every((c) => /ok$/.test(c));
    if (checks.length) ok ? pass++ : fail++;
    out.push(`| ${p} | ${b.impr}→${a.impr} | ${b.clicks}→${a.clicks} | ${f2(ctrB)}%→${f2(ctrA)}% | ${f1(b.pos)}→${f1(a.pos)} | ${checks.length ? (ok ? "PASS" : "FAIL") + " (" + checks.join(", ") + ")" : "n/a (<20 impr)"} |`);
  }
  out.push("");
  const stale = pa.rows.filter((r) => /\.html$/.test(r.path) || !r.url.startsWith(SITE));
  out.push(`Legacy URLs still in the after report (.html or non-www): ${stale.length ? stale.map((r) => r.url + " (" + r.impr + " impr)").join(", ") : "none"}`);
  out.push("");
  out.push(`**Targets: ${pass} pass, ${fail} fail.** Pages under 20 impressions are not judged.`);
  console.log(out.join("\n"));
}

main();
