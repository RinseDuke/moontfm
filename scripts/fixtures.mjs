import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Independently authored binary construction from the published directory layout.
// Each word and character below has known, exact values; this is not parser output.
export function fixture(options = {}) {
  const { bc = 65, chars = [[1, 0x10, 0, 0]],
    header = [0x12345678, 10 * 1048576], widths = [0, 524288], heights = [0, 734003],
    depths = [0], italics = [0], lig = [], kerns = [], exten = [], params = [] } = options;
  const ec = bc + chars.length - 1;
  const tables = [widths, heights, depths, italics, lig, kerns, exten, params];
  const lengths = [6 + header.length + chars.length + tables.reduce((n, t) => n + t.length, 0),
    header.length, bc, ec, ...tables.map(t => t.length)];
  const bytes = Buffer.alloc(lengths[0] * 4);
  lengths.forEach((x, i) => bytes.writeUInt16BE(x, i * 2));
  let offset = 24;
  for (const table of [header, chars, ...tables]) for (const word of table) {
    if (Array.isArray(word)) word.forEach((b, i) => { bytes[offset + i] = b; });
    else bytes.writeInt32BE(word | 0, offset);
    offset += 4;
  }
  return bytes;
}

export function fixtures() {
  const base = fixture();
  const bad = Buffer.from(base); bad[32] = 250;
  return {
    'minimal.tfm': base,
    'wider.tfm': fixture({ widths: [0, 655360] }),
    'bad-index.tfm': bad,
    'bad-boundary-entry.tfm': fixture({ chars: [[1, 0x10, 1, 0]],
      lig: [[255, 250, 255, 255], [128, 65, 128, 0]], kerns: [-1] }),
    'truncated.tfm': base.subarray(0, base.length - 1),
    'empty.tfm': fixture({ bc: 1, chars: [] }),
    'zero-width.tfm': fixture({ widths: [0, 0] }),
    'negative.tfm': fixture({ chars: [[1, 0x11, 1, 0]], depths: [0, -131072], lig: [[128, 65, 128, 0]], kerns: [-65536] }),
    'reordered.tfm': fixture({ chars: [[2, 0x10, 0, 0]], widths: [0, 655360, 524288] }),
    'recipe.tfm': fixture({ chars: [[1, 0x10, 3, 0]], exten: [[0, 0, 0, 65]] }),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dest = new URL('../fixtures/', import.meta.url);
  mkdirSync(dest, { recursive: true });
  for (const [name, bytes] of Object.entries(fixtures())) writeFileSync(new URL(name, dest), bytes);
  console.log(`Generated ${Object.keys(fixtures()).length} original TFM fixtures.`);
}
