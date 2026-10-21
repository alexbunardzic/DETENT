import { ArtifactSourcePort, ExceptionStorePort, ProtectedSetPort } from '../../application/ports';
import { parseExceptionStore, parseProtectedManifest } from '../config/detentFiles';

// Read the .detent files through ArtifactSourcePort at a fixed ref, so the
// caller decides which side of the comparison each file is trusted from.

export function refProtectedSet(
  source: ArtifactSourcePort,
  ref: string,
  manifestPath: string,
): ProtectedSetPort {
  return {
    loadProtectedPaths: () => {
      const [manifest] = source.read(ref, [manifestPath]);
      return parseProtectedManifest(manifest.content, `${manifestPath} at ${ref}`);
    },
  };
}

export function refExceptionStore(
  source: ArtifactSourcePort,
  ref: string,
  storePath: string,
): ExceptionStorePort {
  return {
    loadExceptions: () => {
      const [store] = source.read(ref, [storePath]);
      return parseExceptionStore(store.content);
    },
  };
}
