import { Guarantee } from './Guarantee';

export type GuaranteeSurface = readonly Guarantee[];

export function surfaceFrom(gs: Guarantee[]): GuaranteeSurface {
  return gs;
}

export function findInSurface(
  s: GuaranteeSurface,
  identity: string,
): Guarantee | undefined {
  return s.find(g => g.identity === identity);
}
