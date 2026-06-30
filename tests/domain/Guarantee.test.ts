import { Guarantee, guaranteesEqual, isGoverned, isExecutable, isStructured } from '../../src/domain/Guarantee';

test('two Guarantees with the same identity are equal', () => {
  const a: Guarantee = { identity: 'x' };
  const b: Guarantee = { identity: 'x' };
  expect(guaranteesEqual(a, b)).toBe(true);
});

test('two Guarantees with different identities are not equal', () => {
  const a: Guarantee = { identity: 'x' };
  const b: Guarantee = { identity: 'y' };
  expect(guaranteesEqual(a, b)).toBe(false);
});

test('a Guarantee tagged as governed is recognized as governed', () => {
  const g: Guarantee = { identity: 'x', classificationPower: 'governed' };
  expect(isGoverned(g)).toBe(true);
});

test('a Guarantee not tagged as governed is not recognized as governed', () => {
  const g: Guarantee = { identity: 'x' };
  expect(isGoverned(g)).toBe(false);
});

test('a Guarantee tagged as executable is recognized as executable', () => {
  const g: Guarantee = { identity: 'x', classificationPower: 'executable' };
  expect(isExecutable(g)).toBe(true);
});

test('a Guarantee not tagged as executable is not recognized as executable', () => {
  const g: Guarantee = { identity: 'x' };
  expect(isExecutable(g)).toBe(false);
});

test('a Guarantee tagged as structured is recognized as structured', () => {
  const g: Guarantee = { identity: 'x', classificationPower: 'structured' };
  expect(isStructured(g)).toBe(true);
});
