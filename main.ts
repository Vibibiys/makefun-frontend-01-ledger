// Ledger — a frontend for make.fun, submitted as a program/v1 entry.
//
// What lives where:
//   app/          the frontend itself: static files, no build step. A browser opens
//                 app/index.html; a tiny router loads one module per surface (the
//                 board, a bounty, its leaderboard, a profile) and every byte of
//                 data comes from make.fun's public API at run time.
//   screenshots/  three renders of that app on live data; the first is the cover.
//   vendor/       the kit's dossier library, kept byte for byte as shipped,
//                 because the scorer rebuilds the dossier with its own copy and
//                 compares the two.
//
// This program is only the courier. It copies app/ and screenshots/ into the
// output directory and writes dossier.json there with the vendored library.
// The grader runs it twice and expects both runs to write identical bytes, so
// nothing here may depend on the clock, the network or the environment beyond
// MAKEFUN_OUTPUT_DIR, which stands in for /output when run by hand:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's ceilings, handed to the library so an entry that would be refused
// fails here, at home, instead of at the scorer: at most 3 screenshots of
// 256 KiB, app/ within 993 entries and 16 MiB, the dossier text at 160 KiB.
const LIMITS = {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16_777_216,
};

function copyTree(name: string): void {
  const from = join(repoDir, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
copyTree('screenshots');

const dossier = buildDossier(outDir, LIMITS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Ledger handed in: app/, screenshots/ and a ${dossier.length}-byte dossier.json in ${outDir}`);
