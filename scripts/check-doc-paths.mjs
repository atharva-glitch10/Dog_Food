#!/usr/bin/env node
/**
 * Fails if documentation references files that do not exist.
 *
 * Checks, in every Markdown file at the repo root and under docs/ (except
 * docs/archive/, which is kept verbatim for history):
 *   - `backticked` tokens that look like repository paths
 *   - relative Markdown links [text](path) and images ![alt](path)
 *   - file:// links (never valid in a repository)
 *
 * A backticked path is resolved against the repo root, the doc's own folder,
 * backend/ and frontend/ (docs often write `src/...` for backend/src/...).
 *
 * Usage: node scripts/check-doc-paths.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Paths that are legitimately absent from a clean checkout (generated, local or runtime-only).
const ALLOWED_MISSING = new Set([
  '.env',
  'backend/.env',
  'node_modules',
  'node_modules/',
  'dist',
  'dist/',
  'uploads',
  'uploads/',
  'backend/uploads',
  'backend/uploads/',
  'backend/dist',
  'backend/dist/',
  'frontend/dist',
  'frontend/dist/',
  'dist/seed/demo-seed.js',
  'dist/server.js',
]);

const FILE_EXTENSIONS =
  /\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|sql|prisma|sh|bat|conf|txt|png|jpg|jpeg|svg|html|css|toml|example)$/i;

function listDocs() {
  const docs = [];
  for (const entry of fs.readdirSync(root)) {
    if (entry.endsWith('.md')) docs.push(entry);
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (rel !== 'docs/archive') walk(rel);
      } else if (entry.name.endsWith('.md')) {
        docs.push(rel);
      }
    }
  };
  if (fs.existsSync(path.join(root, 'docs'))) walk('docs');
  return docs.sort();
}

/** Heuristic: does a backticked token look like a repository path? */
function looksLikePath(token) {
  if (!token || /\s/.test(token)) return false; // commands, sentences
  if (/^[a-z]+:\/\//i.test(token) || token.startsWith('mailto:')) return false; // URLs
  if (token.startsWith('/')) return false; // URL paths such as /api/health, /uploads
  if (/[*<>{}$|?=@]/.test(token)) return false; // globs, placeholders, expressions, emails
  if (/^[\w.-]+:\/?/.test(token) && !token.includes('/')) return false; // key:value, host:port
  if (token.includes(':')) return false; // route params (:eventId), host:port, times
  if (token.startsWith('-') || token.startsWith('.') && token.length < 3) return false;
  if (token.includes('/')) return /^[\w@.\-/]+$/.test(token);
  return FILE_EXTENSIONS.test(token) && /^[\w.\-]+$/.test(token) && token.includes('.') && !/^\d/.test(token);
}

function existsAny(candidates) {
  return candidates.some((c) => fs.existsSync(path.join(root, c)));
}

// All repository files (for bare names such as `scoring.service.ts` or `middleware/auditLogger.ts`).
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'archive', 'uploads']);
const repoFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('chrome-')) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(rel);
    else repoFiles.push(rel);
  }
})('');

/** A partial path is valid if exactly one repository file ends with it. */
function uniqueSuffixMatch(token) {
  return repoFiles.filter((f) => f === token || f.endsWith(`/${token}`)).length === 1;
}

function stripCodeFences(markdown) {
  // Fenced blocks contain commands and sample output, not path references.
  return markdown.replace(/^```[\s\S]*?^```/gm, '');
}

const problems = [];
let checked = 0;

for (const doc of listDocs()) {
  const raw = fs.readFileSync(path.join(root, doc), 'utf8');
  const text = stripCodeFences(raw);
  const docDir = path.posix.dirname(doc);
  const lineOf = (index) => raw.slice(0, raw.indexOf(text.slice(index, index + 40))).split('\n').length;

  for (const m of raw.matchAll(/file:\/\/\/?[^\s)`'"]+/g)) {
    problems.push(`${doc}:${raw.slice(0, m.index).split('\n').length}: file:// link "${m[0]}"`);
  }

  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const token = m[1].trim().replace(/[.,;]+$/, '').replace(/^\.\//, '');
    if (!looksLikePath(token)) continue;
    checked++;
    const clean = token.replace(/\/$/, '');
    if (ALLOWED_MISSING.has(token) || ALLOWED_MISSING.has(clean)) continue;
    const candidates = [clean, path.posix.join(docDir, clean), `backend/${clean}`, `frontend/${clean}`];
    if (!existsAny(candidates) && !uniqueSuffixMatch(clean)) problems.push(`${doc}:${lineOf(m.index)}: missing path \`${token}\``);
  }

  for (const m of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    let target = m[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue; // external / anchor
    target = decodeURIComponent(target.split('#')[0]);
    if (!target) continue;
    checked++;
    const resolved = target.startsWith('/') ? target.slice(1) : path.posix.join(docDir, target);
    if (!fs.existsSync(path.join(root, resolved))) problems.push(`${doc}:${lineOf(m.index)}: broken link (${m[1]})`);
  }
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} broken documentation reference(s) (checked ${checked}):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`✓ All ${checked} documentation path references resolve.`);
