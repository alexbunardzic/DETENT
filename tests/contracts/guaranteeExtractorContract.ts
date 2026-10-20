import { GuaranteeExtractorPort } from '../../src/application/ports';

export function guaranteeExtractorContract(
  name: string,
  makeSubject: () => GuaranteeExtractorPort,
): void {
  describe(`GuaranteeExtractorPort contract: ${name}`, () => {
    let extractor: GuaranteeExtractorPort;

    beforeAll(() => {
      extractor = makeSubject();
    });

    test('yields one guarantee per present source, identified by its path', () => {
      const surface = extractor.extract([
        { path: 'CLAUDE.md', content: 'rules\n' },
        { path: 'docs/spec.md', content: 'spec\n' },
      ]);

      expect(surface.map(g => g.identity)).toEqual(['CLAUDE.md', 'docs/spec.md']);
    });

    test('yields no guarantee for a source with no content', () => {
      const surface = extractor.extract([
        { path: 'CLAUDE.md', content: undefined },
        { path: 'docs/spec.md', content: 'spec\n' },
      ]);

      expect(surface.map(g => g.identity)).toEqual(['docs/spec.md']);
    });

    test('declares the classification power of every guarantee it yields', () => {
      const [guarantee] = extractor.extract([{ path: 'CLAUDE.md', content: 'rules\n' }]);

      expect(guarantee.classificationPower).toBeDefined();
    });

    test('seals identical content identically', () => {
      const [a] = extractor.extract([{ path: 'CLAUDE.md', content: 'rules\n' }]);
      const [b] = extractor.extract([{ path: 'CLAUDE.md', content: 'rules\n' }]);

      expect(a.seal).toBe(b.seal);
    });

    test('seals different content differently', () => {
      const [a] = extractor.extract([{ path: 'CLAUDE.md', content: 'rules\n' }]);
      const [b] = extractor.extract([{ path: 'CLAUDE.md', content: 'rules, relaxed\n' }]);

      expect(a.seal).not.toBe(b.seal);
    });
  });
}
