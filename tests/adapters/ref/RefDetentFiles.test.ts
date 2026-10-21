import { refExceptionStore, refProtectedSet } from '../../../src/adapters/ref/RefDetentFiles';
import { exceptionStoreContract } from '../../contracts/exceptionStoreContract';
import { protectedSetContract } from '../../contracts/protectedSetContract';
import { fakePorts } from '../../fakes/ports';

const MANIFEST = '.detent/protected.json';
const STORE = '.detent/exceptions.json';

function sourceWith(refs: Record<string, Record<string, string>>) {
  return fakePorts({ refs }).artifacts;
}

protectedSetContract('ref', protectedPaths =>
  refProtectedSet(
    sourceWith({ base: { [MANIFEST]: JSON.stringify({ protected: protectedPaths }) } }),
    'base',
    MANIFEST,
  ),
);

exceptionStoreContract('ref', exceptions =>
  refExceptionStore(
    sourceWith({
      cand: {
        [STORE]: JSON.stringify({
          exceptions: exceptions.map(e => ({
            ...e,
            ...(e.expiresAt ? { expiresAt: e.expiresAt.toISOString() } : {}),
          })),
        }),
      },
    }),
    'cand',
    STORE,
  ),
);

describe('protected set read from a ref', () => {
  test('reads the manifest at the given ref, not at any other', () => {
    const source = sourceWith({
      base: { [MANIFEST]: JSON.stringify({ protected: ['spec.md', MANIFEST] }) },
      cand: { [MANIFEST]: JSON.stringify({ protected: [] }) },
    });

    expect(refProtectedSet(source, 'base', MANIFEST).loadProtectedPaths()).toEqual([
      'spec.md',
      MANIFEST,
    ]);
  });

  test('a manifest absent at the ref is an error, never an empty protected set', () => {
    const source = sourceWith({ base: {} });

    expect(() => refProtectedSet(source, 'base', MANIFEST).loadProtectedPaths()).toThrow(
      `${MANIFEST} at base`,
    );
  });
});

describe('exception store read from a ref', () => {
  test('reads the store at the given ref, not at any other', () => {
    const exception = { identity: 'spec.md', baselineSeal: 'sha256:a', candidateSeal: 'sha256:b' };
    const source = sourceWith({
      base: { [STORE]: JSON.stringify({ exceptions: [] }) },
      cand: { [STORE]: JSON.stringify({ exceptions: [exception] }) },
    });

    expect(refExceptionStore(source, 'cand', STORE).loadExceptions()).toEqual([exception]);
  });

  test('a store absent at the ref yields no exceptions', () => {
    expect(refExceptionStore(sourceWith({ cand: {} }), 'cand', STORE).loadExceptions()).toEqual(
      [],
    );
  });

  test('a malformed store at the ref yields no exceptions', () => {
    const source = sourceWith({ cand: { [STORE]: '{ "exceptions": [' } });

    expect(refExceptionStore(source, 'cand', STORE).loadExceptions()).toEqual([]);
  });
});
