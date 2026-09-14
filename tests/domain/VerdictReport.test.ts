import { buildReport, renderHuman } from '../../src/domain/VerdictReport';

test('an empty set of verdicts is not blocked', () => {
  expect(buildReport([]).blocked).toBe(false);
});

test('a single blocking verdict blocks the report', () => {
  expect(
    buildReport([
      { identity: 'src/a.ts', verdict: 'Preserved', blocking: false },
      { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
    ]).blocked,
  ).toBe(true);
});

test('every blocking verdict appears in the report, none dropped', () => {
  const report = buildReport([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
    { identity: 'src/a.ts', verdict: 'Preserved', blocking: false },
    { identity: 'AGENTS.md', verdict: 'Removed', blocking: true },
  ]);

  expect(report.blocking.map(i => i.identity)).toEqual(['CLAUDE.md', 'AGENTS.md']);
});

test('a blocking governed item explains itself and names the protected file', () => {
  const [item] = buildReport([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
  ]).blocking;

  expect(item.explanation).toBe(
    'CLAUDE.md changed without an authorized exception',
  );
});

test('a blocking Removed item reports deletion, not a change', () => {
  const [item] = buildReport([
    { identity: 'AGENTS.md', verdict: 'Removed', blocking: true },
  ]).blocking;

  expect(item.explanation).toBe(
    'AGENTS.md was removed without an authorized exception',
  );
});

test('authorized drift is retained in the report and described as authorized', () => {
  const report = buildReport([
    { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: false },
  ]);

  expect(report.blocked).toBe(false);
  expect(report.authorized).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'ChangedUnderGovernance',
      explanation: 'CLAUDE.md changed under an authorized exception',
    },
  ]);
});

test('an Incomparable verdict appears as a warning, not a block', () => {
  const report = buildReport([
    { identity: 'account.test.ts::rejects an overdraw', verdict: 'Incomparable', blocking: false },
  ]);

  expect(report.blocked).toBe(false);
  expect(report.warnings).toEqual([
    {
      identity: 'account.test.ts::rejects an overdraw',
      verdict: 'Incomparable',
      explanation:
        'account.test.ts::rejects an overdraw changed in a way that could not be compared',
    },
  ]);
});

test('the human rendering names every blocking item', () => {
  const rendered = renderHuman(
    buildReport([
      { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: true },
      { identity: 'AGENTS.md', verdict: 'Removed', blocking: true },
    ]),
  );

  expect(rendered).toContain('CLAUDE.md changed without an authorized exception');
  expect(rendered).toContain('AGENTS.md was removed without an authorized exception');
});

test('a clean report does not render as blocked', () => {
  const rendered = renderHuman(
    buildReport([{ identity: 'CLAUDE.md', verdict: 'Preserved', blocking: false }]),
  );

  expect(rendered).toBe('Detent: no drift detected');
});

test('warnings and authorized changes render even when nothing blocks', () => {
  const rendered = renderHuman(
    buildReport([
      { identity: 'CLAUDE.md', verdict: 'ChangedUnderGovernance', blocking: false },
      { identity: 'a.test.ts::x', verdict: 'Incomparable', blocking: false },
    ]),
  );

  expect(rendered).toBe(
    [
      'Detent: no blocking drift',
      '',
      'Warnings:',
      '  - a.test.ts::x changed in a way that could not be compared',
      '',
      'Authorized:',
      '  - CLAUDE.md changed under an authorized exception',
    ].join('\n'),
  );
});
