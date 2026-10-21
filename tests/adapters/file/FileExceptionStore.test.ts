import { fileExceptionStore } from '../../../src/adapters/file/FileExceptionStore';
import { exceptionStoreContract } from '../../contracts/exceptionStoreContract';
import { tempFiles } from '../../fixtures/tempFiles';

const files = tempFiles();
afterAll(() => files.cleanup());

const VALID = {
  identity: 'md2html-SPEC.md',
  baselineSeal: 'sha256:aaa',
  candidateSeal: 'sha256:bbb',
};

function storeWith(content: unknown) {
  return fileExceptionStore(files.write('exceptions.json', JSON.stringify(content)));
}

exceptionStoreContract('file', exceptions =>
  storeWith({
    exceptions: exceptions.map(e => ({
      ...e,
      ...(e.expiresAt ? { expiresAt: e.expiresAt.toISOString() } : {}),
    })),
  }),
);

describe('file exception store fails closed', () => {
  test('a missing store yields no exceptions', () => {
    expect(fileExceptionStore(files.pathFor('exceptions.json')).loadExceptions()).toEqual([]);
  });

  test('a store that is not valid JSON yields no exceptions', () => {
    const file = files.write('exceptions.json', '{ "exceptions": [');

    expect(fileExceptionStore(file).loadExceptions()).toEqual([]);
  });

  test('a store without an "exceptions" list yields no exceptions', () => {
    expect(storeWith({ allow: [VALID] }).loadExceptions()).toEqual([]);
  });

  test('one invalid entry voids the whole store, valid entries included', () => {
    const missingSeal = { identity: 'CLAUDE.md', baselineSeal: 'sha256:ccc' };

    expect(storeWith({ exceptions: [VALID, missingSeal] }).loadExceptions()).toEqual([]);
  });

  test('an entry with an empty identity is invalid', () => {
    expect(storeWith({ exceptions: [{ ...VALID, identity: '' }] }).loadExceptions()).toEqual([]);
  });

  test('an entry whose seals are both null authorizes nothing and is invalid', () => {
    expect(
      storeWith({ exceptions: [{ ...VALID, baselineSeal: null, candidateSeal: null }] })
        .loadExceptions(),
    ).toEqual([]);
  });

  test('an entry with an unparseable expiry is invalid', () => {
    expect(
      storeWith({ exceptions: [{ ...VALID, expiresAt: 'next tuesday' }] }).loadExceptions(),
    ).toEqual([]);
  });

  test('fields the domain does not use, such as a reason, are ignored', () => {
    expect(
      storeWith({ exceptions: [{ ...VALID, reason: 'E-17 duplicated E-01' }] }).loadExceptions(),
    ).toEqual([VALID]);
  });
});
