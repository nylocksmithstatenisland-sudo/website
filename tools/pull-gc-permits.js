#!/usr/bin/env node
/*
 * Pull active general contractors across NYC from DOB permit data (NYC Open Data / Socrata).
 *
 * Sources
 *   ipu4-2q9a  DOB Permit Issuance (BIS, legacy jobs still issuing permits)
 *   rbx6-tga4  DOB NOW: Build - Approved Permits (all new filings since ~2020)
 *
 * Output: gc-permits-nyc.csv ranked by permit count, one row per contractor
 *   (business name + phone), with borough spread, job types, recent addresses
 *   and the DOB license number. DOB data carries phone and business address
 *   but never email; the email column is left blank for the lookup step.
 *
 * Usage: node pull-gc-permits.js [months=12] [outdir]
 */
"use strict";
const fs = require("fs");
const path = require("path");

const MONTHS = Number(process.argv[2] || 12);
const OUT = process.argv[3] || path.join(__dirname, "..", "data");
const since = new Date(); since.setMonth(since.getMonth() - MONTHS);
const SINCE = since.toISOString().slice(0, 10) + "T00:00:00";
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || ""; // optional, raises rate limit
const PAGE = 50000;

async function fetchAll(dataset, params) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = new URLSearchParams({ ...params, $limit: String(PAGE), $offset: String(offset) });
    const url = `https://data.cityofnewyork.us/resource/${dataset}.json?${q}`;
    const res = await fetch(url, { headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : {} });
    if (!res.ok) throw new Error(`${dataset} ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    process.stderr.write(`${dataset}: ${rows.length} rows\n`);
    if (batch.length < PAGE) break;
  }
  return rows;
}

// ---- BIS permit issuance: GC permittees on NB (new building) and A1 (major alteration) jobs
async function bis() {
  const rows = await fetchAll("ipu4-2q9a", {
    $select: [
      "permittee_s_business_name", "permittee_s_first_name", "permittee_s_last_name", "permittee_s_phone__",
      "permittee_s_license_type", "permittee_s_license__", "borough", "house__", "street_name", "zip_code",
      "job_type", "work_type", "permit_type", "issuance_date", "job__", "owner_s_business_name",
    ].join(","),
    $where: `issuance_date >= '${SINCE}' AND permittee_s_license_type = 'GENERAL CONTRACTOR' AND job_type in('NB','A1')`,
  });
  return rows.map(r => ({
    source: "BIS", name: r.permittee_s_business_name, contact: [r.permittee_s_first_name, r.permittee_s_last_name].filter(Boolean).join(" "),
    phone: r.permittee_s_phone__, license: r.permittee_s_license__, borough: r.borough,
    address: [r.house__, r.street_name].filter(Boolean).join(" "), zip: r.zip_code,
    jobType: r.job_type, workType: r.work_type || r.permit_type, date: (r.issuance_date || "").slice(0, 10), job: r.job__, owner: r.owner_s_business_name,
  }));
}

// ---- DOB NOW approved permits: applicant business on NB / ALT-CO (major alteration) filings
async function dobnow() {
  const rows = await fetchAll("rbx6-tga4", {
    $select: [
      "applicant_business_name", "applicant_first_name", "applicant_last_name", "applicant_business_address",
      "applicant_license", "borough", "house_no", "street_name", "zip_code", "job_type", "work_type", "work_permit",
      "issued_date", "job_filing_number", "owner_business_name", "filing_reason",
    ].join(","),
    $where: `issued_date >= '${SINCE}' AND job_type in('New Building','Alteration CO','Alteration-CO') AND work_type in('General Construction','GC','General Construction (GC)')`,
  });
  return rows.map(r => ({
    source: "DOBNOW", name: r.applicant_business_name, contact: [r.applicant_first_name, r.applicant_last_name].filter(Boolean).join(" "),
    phone: "", license: r.applicant_license, borough: r.borough,
    address: [r.house_no, r.street_name].filter(Boolean).join(" "), zip: r.zip_code,
    jobType: r.job_type, workType: r.work_type, date: (r.issued_date || "").slice(0, 10), job: r.job_filing_number, owner: r.owner_business_name,
    bizAddress: r.applicant_business_address,
  }));
}

function norm(s) { return String(s || "").toUpperCase().replace(/[.,']/g, "").replace(/\b(INC|LLC|CORP|CO|LTD|THE)\b/g, "").replace(/\s+/g, " ").trim(); }
function csv(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

(async () => {
  const all = [];
  for (const fn of [bis, dobnow]) {
    try { all.push(...await fn()); } catch (e) { console.error("WARN", e.message.slice(0, 300)); }
  }
  const byGc = new Map();
  for (const r of all) {
    if (!r.name) continue;
    const key = norm(r.name);
    if (!key || /OWNER|SELF|N\/A|NONE/.test(key)) continue;
    const g = byGc.get(key) || { name: r.name, contacts: new Set(), phones: new Set(), licenses: new Set(), bizAddress: new Set(), boroughs: {}, jobTypes: {}, permits: 0, jobs: new Set(), recent: [], owners: new Set(), lastDate: "" };
    g.permits++; g.jobs.add(r.job);
    if (r.contact) g.contacts.add(r.contact);
    if (r.phone) g.phones.add(r.phone.replace(/\D/g, ""));
    if (r.license) g.licenses.add(r.license);
    if (r.bizAddress) g.bizAddress.add(r.bizAddress);
    if (r.owner) g.owners.add(r.owner);
    g.boroughs[r.borough] = (g.boroughs[r.borough] || 0) + 1;
    g.jobTypes[r.jobType] = (g.jobTypes[r.jobType] || 0) + 1;
    if (r.date > g.lastDate) g.lastDate = r.date;
    if (g.recent.length < 3 && r.address) g.recent.push(`${r.address} (${r.borough}, ${r.date})`);
    byGc.set(key, g);
  }
  const list = [...byGc.values()].sort((a, b) => (b.boroughs["STATEN ISLAND"] || b.boroughs["Staten Island"] || 0) - (a.boroughs["STATEN ISLAND"] || a.boroughs["Staten Island"] || 0) || b.jobs.size - a.jobs.size);
  const header = ["rank", "contractor", "distinct_jobs", "permits", "staten_island_jobs", "boroughs", "job_types", "contact_name", "phone", "dob_license", "business_address", "recent_sites", "owners_worked_for", "last_permit", "email", "email_source", "status"];
  const out = [header.join(",")];
  list.forEach((g, i) => {
    const si = g.boroughs["STATEN ISLAND"] || g.boroughs["Staten Island"] || 0;
    out.push([
      i + 1, g.name, g.jobs.size, g.permits, si,
      Object.entries(g.boroughs).map(([b, n]) => `${b}:${n}`).join(" | "),
      Object.entries(g.jobTypes).map(([t, n]) => `${t}:${n}`).join(" | "),
      [...g.contacts].slice(0, 2).join(" / "), [...g.phones].slice(0, 2).join(" / "), [...g.licenses].slice(0, 2).join(" / "),
      [...g.bizAddress].slice(0, 1).join(""), g.recent.join(" ; "), [...g.owners].slice(0, 3).join(" ; "), g.lastDate, "", "", "new",
    ].map(csv).join(","));
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, "gc-permits-nyc.csv");
  fs.writeFileSync(file, out.join("\n") + "\n");
  console.log(`permits read: ${all.length}  contractors: ${list.length}  ->  ${file}`);
  console.log(`with phone: ${list.filter(g => g.phones.size).length}  with Staten Island work: ${list.filter(g => g.boroughs["STATEN ISLAND"] || g.boroughs["Staten Island"]).length}`);
})();
