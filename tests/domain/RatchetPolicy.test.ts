import { applyRatchet } from '../../src/domain/RatchetPolicy';

const NOW = new Date('2026-09-13T00:00:00Z');

test('with no exceptions, governed drift stays blocking', () => {
  expect(
    applyRatchet([{ identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance' }], [], NOW),
  ).toEqual([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
  ]);
});

test('an exception matching the identity downgrades governed drift to non-blocking', () => {
  expect(
    applyRatchet(
      [{ identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance' }],
      [{ identity: 'CLAUDE.md' }],
      NOW,
    ),
  ).toEqual([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: false },
  ]);
});

test('a Preserved verdict is not blocking even with no exceptions', () => {
  expect(applyRatchet([{ identity: 'CLAUDE.md', verdict: 'Preserved' }], [], NOW)).toEqual([
    { identity: 'CLAUDE.md', verdict: 'Preserved', blocking: false },
  ]);
});

test('an Incomparable verdict warns rather than blocks', () => {
  expect(applyRatchet([{ identity: 'a.test.ts::x', verdict: 'Incomparable' }], [], NOW)).toEqual([
    { identity: 'a.test.ts::x', verdict: 'Incomparable', blocking: false },
  ]);
});

test('an expired exception is inert and leaves drift blocking', () => {
  expect(
    applyRatchet(
      [{ identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance' }],
      [{ identity: 'CLAUDE.md', expiresAt: new Date('2026-09-12T00:00:00Z') }],
      NOW,
    ),
  ).toEqual([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
  ]);
});

test('an exception for a different identity is inert', () => {
  expect(
    applyRatchet(
      [{ identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance' }],
      [{ identity: 'AGENTS.md' }],
      NOW,
    ),
  ).toEqual([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
  ]);
});

test('an exception cannot upgrade a non-drift verdict into a blocking one', () => {
  expect(
    applyRatchet(
      [{ identity: 'CLAUDE.md', verdict: 'Preserved' }],
      [{ identity: 'CLAUDE.md' }],
      NOW,
    ),
  ).toEqual([{ identity: 'CLAUDE.md', verdict: 'Preserved', blocking: false }]);
});
