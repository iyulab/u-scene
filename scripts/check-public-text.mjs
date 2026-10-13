#!/usr/bin/env node
// Public-text gate: this package is published, so its sources and docs must not carry
// non-English prose or context that only means something inside a consumer project.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGETS = ['src', 'README.md', 'CHANGELOG.md'];
const RULES = [
  [/[ᄀ-ᇿ㄰-㆏가-힯]/, 'Hangul text'],
  [/\bcycle-\d|\bNT-\d|\bD-\d{2,}|\bR\d-\d/, 'internal ticket id'],
  [/[A-Za-z]:\\|\/Users\//, 'absolute path'],
];

function walk(p, out = []) {
  if (statSync(p).isDirectory()) {
    for (const e of readdirSync(p)) walk(join(p, e), out);
  } else if (/\.(ts|md|mjs|js|json)$/.test(p)) {
    out.push(p);
  }
  return out;
}

const files = TARGETS.map((t) => join(ROOT, t)).filter(existsSync).flatMap((p) => walk(p));
if (files.length === 0) {
  console.error('check-public-text: scanned 0 files - the target list is wrong');
  process.exit(1);
}
const hits = [];
for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const [re, why] of RULES) {
      if (re.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${why}: ${line.trim().slice(0, 100)}`);
    }
  });
}
if (hits.length > 0) {
  console.error(`check-public-text: ${hits.length} finding(s)\n` + hits.join('\n'));
  process.exit(1);
}
console.log(`check-public-text: ${files.length} files clean`);
