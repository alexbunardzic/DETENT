import { fileProtectedSet } from '../../../src/adapters/file/FileProtectedSet';
import { protectedSetContract } from '../../contracts/protectedSetContract';
import { tempFiles } from '../../fixtures/tempFiles';

const files = tempFiles();
afterAll(() => files.cleanup());

protectedSetContract('file', protectedPaths =>
  fileProtectedSet(files.write('protected.json', JSON.stringify({ protected: protectedPaths }))),
);

describe('file protected set fails closed', () => {
  test('a missing manifest is an error, never an empty protected set', () => {
    const missing = files.pathFor('protected.json');

    expect(() => fileProtectedSet(missing).loadProtectedPaths()).toThrow(missing);
  });

  test('a manifest that is not valid JSON is an error', () => {
    const file = files.write('protected.json', '{ "protected": [');

    expect(() => fileProtectedSet(file).loadProtectedPaths()).toThrow(file);
  });

  test('a manifest without a "protected" list is an error', () => {
    const file = files.write('protected.json', JSON.stringify({ paths: ['CLAUDE.md'] }));

    expect(() => fileProtectedSet(file).loadProtectedPaths()).toThrow(file);
  });

  test('a manifest with a non-string or empty entry is an error', () => {
    const numeric = files.write('protected.json', JSON.stringify({ protected: ['CLAUDE.md', 7] }));
    const empty = files.write('protected.json', JSON.stringify({ protected: [''] }));

    expect(() => fileProtectedSet(numeric).loadProtectedPaths()).toThrow(numeric);
    expect(() => fileProtectedSet(empty).loadProtectedPaths()).toThrow(empty);
  });
});
