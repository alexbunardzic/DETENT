import { check } from '../../src/application/CheckUseCase';
import { renderHuman } from '../../src/domain/VerdictReport';
import { fakePorts } from '../fakes/ports';

const NOW = new Date('2026-09-13T00:00:00Z');
const REQUEST = { baselineRef: 'HEAD', candidateRef: 'WORKTREE', now: NOW };

test('with nothing protected, the check reports no drift', () => {
  const ports = fakePorts({ protectedPaths: [] });

  expect(renderHuman(check(ports, REQUEST))).toBe('Detent: no drift detected');
});

test('a protected file identical in both refs is not blocked', () => {
  const ports = fakePorts({
    protectedPaths: ['CLAUDE.md'],
    refs: {
      HEAD: { 'CLAUDE.md': 'rules' },
      WORKTREE: { 'CLAUDE.md': 'rules' },
    },
  });

  expect(check(ports, REQUEST).blocked).toBe(false);
});

test('a protected file changed in the candidate blocks and names the file', () => {
  const ports = fakePorts({
    protectedPaths: ['CLAUDE.md'],
    refs: {
      HEAD: { 'CLAUDE.md': 'rules' },
      WORKTREE: { 'CLAUDE.md': 'relaxed rules' },
    },
  });

  const report = check(ports, REQUEST);

  expect(report.blocked).toBe(true);
  expect(report.blocking).toEqual([
    {
      identity: 'CLAUDE.md',
      verdict: 'ChangedUnderGovernance',
      explanation: 'CLAUDE.md changed without an authorized exception',
    },
  ]);
});

test('an exception from the store clears the block', () => {
  const ports = fakePorts({
    protectedPaths: ['CLAUDE.md'],
    refs: {
      HEAD: { 'CLAUDE.md': 'rules' },
      WORKTREE: { 'CLAUDE.md': 'relaxed rules' },
    },
    exceptions: [{ identity: 'CLAUDE.md' }],
  });

  const report = check(ports, REQUEST);

  expect(report.blocked).toBe(false);
  expect(report.authorized.map(i => i.identity)).toEqual(['CLAUDE.md']);
});

test('the baseline is read at the baseline ref and the candidate at the candidate ref', () => {
  const ports = fakePorts({
    protectedPaths: ['CLAUDE.md'],
    refs: { HEAD: { 'CLAUDE.md': 'rules' }, WORKTREE: { 'CLAUDE.md': 'rules' } },
  });

  check(ports, REQUEST);

  expect(ports.reads).toEqual([
    { ref: 'HEAD', paths: ['CLAUDE.md'] },
    { ref: 'WORKTREE', paths: ['CLAUDE.md'] },
  ]);
});

test('a path absent from the protected manifest is never read', () => {
  const ports = fakePorts({
    protectedPaths: ['CLAUDE.md'],
    refs: {
      HEAD: { 'CLAUDE.md': 'rules', 'README.md': 'a' },
      WORKTREE: { 'CLAUDE.md': 'rules', 'README.md': 'b' },
    },
  });

  const report = check(ports, REQUEST);

  expect(ports.reads.every(r => r.paths.every(p => p === 'CLAUDE.md'))).toBe(true);
  expect(report.blocked).toBe(false);
});

test('a protected path missing from both refs warns rather than passing silently', () => {
  const ports = fakePorts({
    protectedPaths: ['AGENTS.md'],
    refs: { HEAD: {}, WORKTREE: {} },
  });

  const report = check(ports, REQUEST);

  expect(report.blocked).toBe(false);
  expect(report.warnings).toEqual([
    {
      identity: 'AGENTS.md',
      explanation: 'AGENTS.md is declared protected but was not found in either ref',
    },
  ]);
});

test('a protected path present in only one ref is not reported as unresolved', () => {
  const ports = fakePorts({
    protectedPaths: ['AGENTS.md'],
    refs: { HEAD: { 'AGENTS.md': 'rules' }, WORKTREE: {} },
  });

  const report = check(ports, REQUEST);

  expect(report.warnings).toEqual([]);
  expect(report.blocking.map(i => i.verdict)).toEqual(['Removed']);
});
