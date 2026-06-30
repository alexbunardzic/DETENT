import { Guarantee } from '../../src/domain/Guarantee';
import { surfaceFrom, findInSurface } from '../../src/domain/GuaranteeSurface';

test('a GuaranteeSurface returns the Guarantee with the given identity', () => {
  const g: Guarantee = { identity: 'g1' };
  const surface = surfaceFrom([g]);
  expect(findInSurface(surface, 'g1')).toEqual(g);
});
