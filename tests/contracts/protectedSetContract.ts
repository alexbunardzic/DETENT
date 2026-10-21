import { ProtectedSetPort } from '../../src/application/ports';

export function protectedSetContract(
  name: string,
  makeSubject: (protectedPaths: string[]) => ProtectedSetPort,
): void {
  describe(`ProtectedSetPort contract: ${name}`, () => {
    test('returns the declared paths in declaration order', () => {
      const port = makeSubject(['md2html-SPEC.md', 'CLAUDE.md', 'docs/rules.md']);

      expect(port.loadProtectedPaths()).toEqual([
        'md2html-SPEC.md',
        'CLAUDE.md',
        'docs/rules.md',
      ]);
    });

    test('returns an empty list when nothing is declared', () => {
      expect(makeSubject([]).loadProtectedPaths()).toEqual([]);
    });
  });
}
