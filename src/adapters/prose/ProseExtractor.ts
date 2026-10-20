import { createHash } from 'crypto';
import { GuaranteeExtractorPort } from '../../application/ports';
import { Guarantee } from '../../domain/Guarantee';
import { surfaceFrom } from '../../domain/GuaranteeSurface';

// Normalizes only what a checkout or an editor can alter without the author
// meaning to: line endings and a leading byte-order mark. Everything else,
// trailing whitespace included, is part of the sealed text.
function normalize(content: string): string {
  return content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

function seal(content: string): string {
  return `sha256:${createHash('sha256').update(normalize(content), 'utf8').digest('hex')}`;
}

// Prose cannot be graded, only governed: identity is the path and the seal
// is a digest of the normalized text.
export function proseExtractor(): GuaranteeExtractorPort {
  return {
    extract: sources =>
      surfaceFrom(
        sources.flatMap((s): Guarantee[] =>
          s.content === undefined
            ? []
            : [{ identity: s.path, classificationPower: 'governed', seal: seal(s.content) }],
        ),
      ),
  };
}
