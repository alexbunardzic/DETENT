import { Guarantee } from '../../src/domain/Guarantee';
import { surfaceFrom } from '../../src/domain/GuaranteeSurface';
import { classify } from '../../src/domain/classify';

test('a governed guarantee whose seal is unchanged is Preserved', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const candidate: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([candidate]))).toEqual([
    { identity: 'CLAUDE.md', verdict: 'Preserved' },
  ]);
});

test('a governed guarantee whose seal changed is ChangedUnderGovernance', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const candidate: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:def',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([candidate]))).toEqual([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance' },
  ]);
});

test('a governed guarantee absent from the candidate surface is Removed', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([]))).toEqual([
    { identity: 'CLAUDE.md', verdict: 'Removed' },
  ]);
});

test('an executable guarantee whose seal changed is Incomparable, not a governance breach', () => {
  const baseline: Guarantee = {
    identity: 'account.test.ts::rejects an overdraw',
    classificationPower: 'executable',
    seal: 'sha256:abc',
  };
  const candidate: Guarantee = {
    identity: 'account.test.ts::rejects an overdraw',
    classificationPower: 'executable',
    seal: 'sha256:def',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([candidate]))).toEqual([
    { identity: 'account.test.ts::rejects an overdraw', verdict: 'Incomparable' },
  ]);
});
