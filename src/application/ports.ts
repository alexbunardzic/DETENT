import { GuaranteeSurface } from '../domain/GuaranteeSurface';
import { Exception } from '../domain/RatchetPolicy';

export interface ArtifactSource {
  path: string;
  content: string | undefined;
}

export interface ProtectedSetPort {
  loadProtectedPaths(): string[];
}

export interface ArtifactSourcePort {
  read(ref: string, paths: readonly string[]): ArtifactSource[];
}

export interface GuaranteeExtractorPort {
  extract(sources: readonly ArtifactSource[]): GuaranteeSurface;
}

export interface ExceptionStorePort {
  loadExceptions(): Exception[];
}

export interface CheckPorts {
  protectedSet: ProtectedSetPort;
  artifacts: ArtifactSourcePort;
  extractor: GuaranteeExtractorPort;
  exceptions: ExceptionStorePort;
}
