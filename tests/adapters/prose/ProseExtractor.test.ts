import { proseExtractor } from '../../../src/adapters/prose/ProseExtractor';
import { guaranteeExtractorContract } from '../../contracts/guaranteeExtractorContract';

guaranteeExtractorContract('prose', () => proseExtractor());

function sealOf(content: string): string | undefined {
  const [guarantee] = proseExtractor().extract([{ path: 'CLAUDE.md', content }]);
  return guarantee.seal;
}

describe('prose extractor', () => {
  test('classifies every guarantee as governed', () => {
    const [guarantee] = proseExtractor().extract([{ path: 'CLAUDE.md', content: 'rules\n' }]);

    expect(guarantee.classificationPower).toBe('governed');
  });

  test('seals with a SHA-256 digest, not the content itself', () => {
    expect(sealOf('rules\n')).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test('treats CRLF and CR line endings as LF', () => {
    expect(sealOf('one\r\ntwo\r\n')).toBe(sealOf('one\ntwo\n'));
    expect(sealOf('one\rtwo\r')).toBe(sealOf('one\ntwo\n'));
  });

  test('ignores a leading byte-order mark', () => {
    expect(sealOf('﻿rules\n')).toBe(sealOf('rules\n'));
  });

  test('keeps trailing spaces significant, since Markdown reads two as a line break', () => {
    expect(sealOf('one  \ntwo\n')).not.toBe(sealOf('one\ntwo\n'));
  });
});
