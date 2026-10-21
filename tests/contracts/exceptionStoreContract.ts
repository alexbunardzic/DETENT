import { ExceptionStorePort } from '../../src/application/ports';
import { Exception } from '../../src/domain/RatchetPolicy';

export function exceptionStoreContract(
  name: string,
  makeSubject: (exceptions: Exception[]) => ExceptionStorePort,
): void {
  describe(`ExceptionStorePort contract: ${name}`, () => {
    test('returns each stored exception with its identity and both seals', () => {
      const stored: Exception[] = [
        { identity: 'md2html-SPEC.md', baselineSeal: 'sha256:aaa', candidateSeal: 'sha256:bbb' },
        { identity: 'CLAUDE.md', baselineSeal: 'sha256:ccc', candidateSeal: 'sha256:ddd' },
      ];

      expect(makeSubject(stored).loadExceptions()).toEqual(stored);
    });

    test('keeps a null candidate seal, which authorizes a removal', () => {
      const stored: Exception[] = [
        { identity: 'CLAUDE.md', baselineSeal: 'sha256:ccc', candidateSeal: null },
      ];

      expect(makeSubject(stored).loadExceptions()).toEqual(stored);
    });

    test('keeps an expiry as a Date', () => {
      const stored: Exception[] = [
        {
          identity: 'CLAUDE.md',
          baselineSeal: 'sha256:ccc',
          candidateSeal: 'sha256:ddd',
          expiresAt: new Date('2026-11-01T00:00:00Z'),
        },
      ];

      expect(makeSubject(stored).loadExceptions()).toEqual(stored);
    });

    test('returns no exceptions when none are stored', () => {
      expect(makeSubject([]).loadExceptions()).toEqual([]);
    });
  });
}
