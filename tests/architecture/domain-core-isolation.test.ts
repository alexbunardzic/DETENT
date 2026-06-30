import * as fs from 'fs';
import * as path from 'path';

const DOMAIN_DIR = path.resolve(__dirname, '..', '..', 'src', 'domain');

const DISALLOWED_INTERNAL_LAYERS = ['adapters', 'runtime'];

const DISALLOWED_NODE_MODULES = new Set([
  'fs',
  'fs/promises',
  'path',
  'child_process',
  'os',
  'crypto',
  'net',
  'http',
  'https',
  'stream',
  'process',
  'dgram',
  'tls',
  'dns',
  'cluster',
  'worker_threads',
]);

const IMPORT_SPECIFIER_REGEX =
  /(?:import\s+(?:[^'"`;]+?\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;

function listTypeScriptFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTypeScriptFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function extractImportSpecifiers(source: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(IMPORT_SPECIFIER_REGEX);
  while ((match = re.exec(source)) !== null) out.push(match[1]);
  return out;
}

function violationReason(spec: string): string | null {
  if (spec.startsWith('.')) {
    const normalized = spec.replace(/\\/g, '/');
    for (const layer of DISALLOWED_INTERNAL_LAYERS) {
      if (
        normalized.includes(`/${layer}/`) ||
        normalized.endsWith(`/${layer}`)
      ) {
        return `imports relative path into "${layer}" layer`;
      }
    }
    return null;
  }
  const bare = spec.startsWith('node:') ? spec.slice('node:'.length) : spec;
  if (DISALLOWED_NODE_MODULES.has(bare)) {
    return `imports Node IO module "${spec}"`;
  }
  return null;
}

test('domain core imports nothing from adapters or Node IO modules', () => {
  if (!fs.existsSync(DOMAIN_DIR)) {
    throw new Error(
      `Domain core directory does not exist: ${DOMAIN_DIR}. ` +
        `The hexagonal architecture requires a pure domain core at src/domain.`,
    );
  }

  const files = listTypeScriptFiles(DOMAIN_DIR);
  if (files.length === 0) {
    throw new Error(
      `Domain core directory contains no TypeScript files: ${DOMAIN_DIR}. ` +
        `A walking-skeleton domain core must contain at least one file.`,
    );
  }

  const violations: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const spec of extractImportSpecifiers(source)) {
      const reason = violationReason(spec);
      if (reason) {
        violations.push(
          `${path.relative(DOMAIN_DIR, file)}: ${reason} ('${spec}')`,
        );
      }
    }
  }

  expect(violations).toEqual([]);
});
