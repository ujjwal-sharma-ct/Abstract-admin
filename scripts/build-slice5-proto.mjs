// Build each portal's slice5-proto.js from scripts/slice5-proto.src.js (run from the abstract admin folder:
// `node scripts/build-slice5-proto.mjs`). A block fenced by `//#if <portal> [<portal> …]` … `//#endif` is kept only in
// the copies of the portals it names; the fence lines themselves are dropped, so what a portal's responses would not
// carry is removed from its file, not hidden (slice 4's rule). Fences do not nest. Every copy is syntax-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');                       // Design/abstract admin
const PORTALS = { abstract: root, client: resolve(root, '../client'), agency: resolve(root, '../agency login') };
const src = readFileSync(join(here, 'slice5-proto.src.js'), 'utf8').replace(/\r\n/g, '\n');
const FENCE = /^\s*\/\/#if\s+([a-z ]+?)\s*$/, END = /^\s*\/\/#endif\s*$/;

for (const [portal, dir] of Object.entries(PORTALS)) {
  const out = []; let keep = true, open = null, n = 0;
  for (const line of src.split('\n')) {
    n++;
    const m = FENCE.exec(line);
    if (m) {
      if (open) throw new Error(`line ${n}: //#if inside the //#if of line ${open}`);
      const names = m[1].split(/\s+/);
      names.forEach(p => { if (!PORTALS[p]) throw new Error(`line ${n}: unknown portal "${p}"`); });
      open = n; keep = names.includes(portal); continue;
    }
    if (END.test(line)) { if (!open) throw new Error(`line ${n}: //#endif with no //#if`); open = null; keep = true; continue; }
    if (keep) out.push(line);
  }
  if (open) throw new Error(`the //#if of line ${open} is not closed`);
  const text = out.join('\n').replace(/^ \* SOURCE:/m, ` * BUILT for the ${portal} portal — do not edit; edit the source and rebuild.\n * SOURCE:`);
  const file = join(dir, 'slice5-proto.js');
  writeFileSync(file, text.replace(/\n/g, '\r\n'));
  execFileSync(process.execPath, ['--check', file]);
  console.log(`${portal}: ${file} (${out.length} lines)`);
}
