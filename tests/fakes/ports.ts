import { Guarantee } from '../../src/domain/Guarantee';
import { GuaranteeSurface, surfaceFrom } from '../../src/domain/GuaranteeSurface';
import { Exception } from '../../src/domain/RatchetPolicy';
import { ArtifactSource, CheckPorts } from '../../src/application/ports';

export interface FakeSpec {
  protectedPaths?: string[];
  refs?: Record<string, Record<string, string>>;
  exceptions?: Exception[];
}

export interface FakeHarness extends CheckPorts {
  reads: { ref: string; paths: readonly string[] }[];
}

export function fakePorts(spec: FakeSpec): FakeHarness {
  const reads: { ref: string; paths: readonly string[] }[] = [];

  return {
    reads,
    protectedSet: {
      loadProtectedPaths: () => spec.protectedPaths ?? [],
    },
    artifacts: {
      read: (ref, paths) => {
        reads.push({ ref, paths });
        const atRef = spec.refs?.[ref] ?? {};
        return paths.map((path): ArtifactSource => ({
          path,
          content: Object.prototype.hasOwnProperty.call(atRef, path)
            ? atRef[path]
            : undefined,
        }));
      },
    },
    extractor: {
      extract: (sources): GuaranteeSurface =>
        surfaceFrom(
          sources
            .filter(s => s.content !== undefined)
            .map((s): Guarantee => ({
              identity: s.path,
              classificationPower: 'governed',
              seal: s.content,
            })),
        ),
    },
    exceptions: {
      loadExceptions: () => spec.exceptions ?? [],
    },
  };
}
