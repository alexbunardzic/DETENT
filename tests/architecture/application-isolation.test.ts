import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '..', '..', 'src');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');
const ADAPTERS_DIR = path.join(SRC_DIR, 'adapters');

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

function isInside(dir: string, target: string): boolean {
  return target === dir || target.startsWith(dir + path.sep);
}

test('application layer depends on ports, never on concrete adapters', () => {
  const violations: string[] = [];
  for (const file of listTypeScriptFiles(APPLICATION_DIR)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const spec of extractImportSpecifiers(source)) {
      if (!spec.startsWith('.')) continue;
      if (isInside(ADAPTERS_DIR, path.resolve(path.dirname(file), spec))) {
        violations.push(
          `${path.relative(APPLICATION_DIR, file)}: imports adapter ('${spec}')`,
        );
      }
    }
  }

  expect(violations).toEqual([]);
});
