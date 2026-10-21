import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Hands out paths inside one throwaway directory, removed by cleanup().
export function tempFiles(): {
  pathFor(name: string): string;
  write(name: string, content: string): string;
  cleanup(): void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detent-files-'));
  let counter = 0;
  const pathFor = (name: string) => path.join(dir, `${counter++}-${name}`);

  return {
    pathFor,
    write: (name, content) => {
      const file = pathFor(name);
      fs.writeFileSync(file, content);
      return file;
    },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
