import { ArtifactSourcePort } from '../../src/application/ports';

// Each label names a full snapshot of the repository: the files it holds
// and their content. Snapshots are applied in insertion order, so a file
// missing from a later snapshot was deleted by then.
export type FixtureHistory = Record<string, Record<string, string>>;

export interface ArtifactSourceSubject {
  port: ArtifactSourcePort;
  ref(label: string): string;
  unknownRef: string;
}

export const CONTRACT_HISTORY: FixtureHistory = {
  baseline: { 'CLAUDE.md': 'rules v1\n', 'docs/spec.md': 'spec v1\n' },
  candidate: { 'CLAUDE.md': 'rules v2\n' },
};

export function artifactSourceContract(
  name: string,
  makeSubject: (history: FixtureHistory) => ArtifactSourceSubject,
): void {
  describe(`ArtifactSourcePort contract: ${name}`, () => {
    let subject: ArtifactSourceSubject;

    beforeAll(() => {
      subject = makeSubject(CONTRACT_HISTORY);
    });

    test('returns one source per requested path, in request order', () => {
      const sources = subject.port.read(subject.ref('baseline'), [
        'docs/spec.md',
        'CLAUDE.md',
      ]);

      expect(sources.map(s => s.path)).toEqual(['docs/spec.md', 'CLAUDE.md']);
    });

    test('returns the content a path had at the given ref', () => {
      const [source] = subject.port.read(subject.ref('baseline'), ['CLAUDE.md']);

      expect(source.content).toBe('rules v1\n');
    });

    test('reads each ref independently of the others', () => {
      const [atBaseline] = subject.port.read(subject.ref('baseline'), ['CLAUDE.md']);
      const [atCandidate] = subject.port.read(subject.ref('candidate'), ['CLAUDE.md']);

      expect(atBaseline.content).toBe('rules v1\n');
      expect(atCandidate.content).toBe('rules v2\n');
    });

    test('reports a path deleted by the ref as undefined content', () => {
      const [source] = subject.port.read(subject.ref('candidate'), ['docs/spec.md']);

      expect(source).toEqual({ path: 'docs/spec.md', content: undefined });
    });

    test('reports a path never committed as undefined content', () => {
      const [source] = subject.port.read(subject.ref('baseline'), ['AGENTS.md']);

      expect(source).toEqual({ path: 'AGENTS.md', content: undefined });
    });

    test('returns no sources when no paths are requested', () => {
      expect(subject.port.read(subject.ref('baseline'), [])).toEqual([]);
    });

    test('rejects a ref that does not exist rather than reporting every path absent', () => {
      expect(() => subject.port.read(subject.unknownRef, ['CLAUDE.md'])).toThrow(
        subject.unknownRef,
      );
    });
  });
}
