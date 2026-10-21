import { GuaranteeVerdict } from '../../src/domain/classify';
import { applyRatchet } from '../../src/domain/RatchetPolicy';

const NOW = new Date('2026-09-13T00:00:00Z');

const CHANGED: GuaranteeVerdict = {
  identity: 'CLAUDE.md',
  verdict: 'ChangedUnderGovernance',
  baselineSeal: 'sha256:abc',
  candidateSeal: 'sha256:def',
};

const REMOVED: GuaranteeVerdict = {
  identity: 'CLAUDE.md',
  verdict: 'Removed',
  baselineSeal: 'sha256:abc',
  candidateSeal: null,
};

const PRESERVED: GuaranteeVerdict = {
  identity: 'CLAUDE.md',
  verdict: 'Preserved',
  baselineSeal: 'sha256:abc',
  candidateSeal: 'sha256:abc',
};

const EXCEPTION_FOR_CHANGE = {
  identity: 'CLAUDE.md',
  baselineSeal: 'sha256:abc',
  candidateSeal: 'sha256:def',
};

test('with no exceptions, governed drift stays blocking', () => {
  expect(applyRatchet([CHANGED], [], NOW)).toEqual([{ ...CHANGED, blocking: true }]);
});

test('an exception naming the identity and both seals downgrades governed drift to non-blocking', () => {
  expect(applyRatchet([CHANGED], [EXCEPTION_FOR_CHANGE], NOW)).toEqual([
    { ...CHANGED, blocking: false },
  ]);
});

test('a Preserved verdict is not blocking even with no exceptions', () => {
  expect(applyRatchet([PRESERVED], [], NOW)).toEqual([{ ...PRESERVED, blocking: false }]);
});

test('an Incomparable verdict warns rather than blocks', () => {
  const incomparable: GuaranteeVerdict = {
    identity: 'a.test.ts::x',
    verdict: 'Incomparable',
    baselineSeal: 'sha256:abc',
    candidateSeal: 'sha256:def',
  };

  expect(applyRatchet([incomparable], [], NOW)).toEqual([
    { ...incomparable, blocking: false },
  ]);
});

test('an expired exception is inert and leaves drift blocking', () => {
  expect(
    applyRatchet(
      [CHANGED],
      [{ ...EXCEPTION_FOR_CHANGE, expiresAt: new Date('2026-09-12T00:00:00Z') }],
      NOW,
    ),
  ).toEqual([{ ...CHANGED, blocking: true }]);
});

test('an exception for a different identity is inert', () => {
  expect(
    applyRatchet([CHANGED], [{ ...EXCEPTION_FOR_CHANGE, identity: 'AGENTS.md' }], NOW),
  ).toEqual([{ ...CHANGED, blocking: true }]);
});

test('an exception cannot upgrade a non-drift verdict into a blocking one', () => {
  expect(
    applyRatchet(
      [PRESERVED],
      [{ identity: 'CLAUDE.md', baselineSeal: 'sha256:abc', candidateSeal: 'sha256:abc' }],
      NOW,
    ),
  ).toEqual([{ ...PRESERVED, blocking: false }]);
});

test('an exception for one edit does not authorize a further edit to the same artifact', () => {
  const furtherEdit: GuaranteeVerdict = { ...CHANGED, candidateSeal: 'sha256:fff' };

  expect(applyRatchet([furtherEdit], [EXCEPTION_FOR_CHANGE], NOW)).toEqual([
    { ...furtherEdit, blocking: true },
  ]);
});

test('an exception is inert when its baseline seal differs from the verdict', () => {
  expect(
    applyRatchet([CHANGED], [{ ...EXCEPTION_FOR_CHANGE, baselineSeal: 'sha256:000' }], NOW),
  ).toEqual([{ ...CHANGED, blocking: true }]);
});

test('a removal is authorized by an exception whose candidate seal is null', () => {
  expect(
    applyRatchet(
      [REMOVED],
      [{ identity: 'CLAUDE.md', baselineSeal: 'sha256:abc', candidateSeal: null }],
      NOW,
    ),
  ).toEqual([{ ...REMOVED, blocking: false }]);
});

test('an exception for an edit does not authorize removing the artifact', () => {
  expect(applyRatchet([REMOVED], [EXCEPTION_FOR_CHANGE], NOW)).toEqual([
    { ...REMOVED, blocking: true },
  ]);
});
