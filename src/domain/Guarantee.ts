export interface Guarantee {
  identity: string;
  classificationPower?: 'governed' | 'executable' | 'structured';
  seal?: string;
}

export function guaranteesEqual(a: Guarantee, b: Guarantee): boolean {
  return a.identity === b.identity;
}

export function isGoverned(g: Guarantee): boolean {
  return g.classificationPower === 'governed';
}

export function isExecutable(g: Guarantee): boolean {
  return g.classificationPower === 'executable';
}

export function isStructured(g: Guarantee): boolean {
  return g.classificationPower === 'structured';
}
