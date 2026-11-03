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
    {
      identity: 'CLAUDE.md',
      verdict: 'Preserved',
      baselineSeal: 'sha256:abc',
      candidateSeal: 'sha256:abc',
    },
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
    {
      identity: 'CLAUDE.md',
      verdict: 'ChangedUnderGovernance',
      baselineSeal: 'sha256:abc',
      candidateSeal: 'sha256:def',
    },
  ]);
});

test('a governed guarantee absent from the candidate surface is Removed', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([]))).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'Removed',
      baselineSeal: 'sha256:abc',
      candidateSeal: null,
    },
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
    {
      identity: 'account.test.ts::rejects an overdraw',
      verdict: 'Incomparable',
      baselineSeal: 'sha256:abc',
      candidateSeal: 'sha256:def',
    },
  ]);
});

test('a guarantee present in the candidate but not the baseline is Added', () => {
  const candidate: Guarantee = {
    identity: 'AGENTS.md',
    classificationPower: 'governed',
    seal: 'sha256:new',
  };

  expect(classify(surfaceFrom([]), surfaceFrom([candidate]))).toEqual([
    {
      identity: 'AGENTS.md',
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: 'sha256:new',
    },
  ]);
});

test('a guarantee with no declared tier whose seal changed is ChangedUnderGovernance', () => {
  const baseline: Guarantee = { identity: 'undeclared.md', seal: 'sha256:abc' };
  const candidate: Guarantee = { identity: 'undeclared.md', seal: 'sha256:def' };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([candidate]))).toEqual([
    {
      identity: 'undeclared.md',
      verdict: 'ChangedUnderGovernance',
      baselineSeal: 'sha256:abc',
      candidateSeal: 'sha256:def',
    },
  ]);
});

test('a governed guarantee whose sealed content reappears at one new identity is Moved', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const candidate: Guarantee = {
    identity: 'docs/CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([candidate]))).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'Moved',
      movedTo: 'docs/CLAUDE.md',
      baselineSeal: 'sha256:abc',
      candidateSeal: 'sha256:abc',
    },
  ]);
});

test('a seal that reappears at two new identities is Removed and both are Added, not Moved', () => {
  const baseline: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const first: Guarantee = {
    identity: 'docs/CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const second: Guarantee = {
    identity: 'agents/CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([baseline]), surfaceFrom([first, second]))).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'Removed',
      baselineSeal: 'sha256:abc',
      candidateSeal: null,
    },
    {
      identity: 'docs/CLAUDE.md',
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: 'sha256:abc',
    },
    {
      identity: 'agents/CLAUDE.md',
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: 'sha256:abc',
    },
  ]);
});

test('two removed guarantees sharing a seal with one new identity are both Removed, not Moved', () => {
  const first: Guarantee = {
    identity: 'CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const second: Guarantee = {
    identity: 'AGENTS.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };
  const candidate: Guarantee = {
    identity: 'docs/CLAUDE.md',
    classificationPower: 'governed',
    seal: 'sha256:abc',
  };

  expect(classify(surfaceFrom([first, second]), surfaceFrom([candidate]))).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'Removed',
      baselineSeal: 'sha256:abc',
      candidateSeal: null,
    },
    {
      identity: 'AGENTS.md',
      verdict: 'Removed',
      baselineSeal: 'sha256:abc',
      candidateSeal: null,
    },
    {
      identity: 'docs/CLAUDE.md',
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: 'sha256:abc',
    },
  ]);
});
