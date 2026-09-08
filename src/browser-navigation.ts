import { applyDeploymentBasePath, stripDeploymentBasePath } from './base-path.ts';
import {
  buildLearningPath,
  isKnownLearningLocation,
  parseLearningLocation,
  type LearningLocation,
} from './locations.ts';

export type KnownLearningIds = {
  lessonIds: ReadonlySet<string>;
  diagnosticIds: ReadonlySet<string>;
  practiceIds: ReadonlySet<string>;
};

export type NavigationHistory = {
  pathname: string;
  push(path: string): void;
  replace(path: string): void;
  subscribe(listener: (pathname: string) => void): () => void;
};

export type ResolvedLearningLocation = {
  location: Exclude<LearningLocation, { kind: 'not-found' }>;
  recoveredFrom: string | null;
};

export function resolveBrowserLocation(
  pathname: string,
  known: KnownLearningIds,
): ResolvedLearningLocation {
  const parsed = parseLearningLocation(pathname);
  if (isKnownLearningLocation(parsed, known) && parsed.kind !== 'not-found') {
    return { location: parsed, recoveredFrom: null };
  }

  return {
    location: { kind: 'dashboard' },
    recoveredFrom: pathname,
  };
}

export function navigateToLearningLocation(
  history: Pick<NavigationHistory, 'push'>,
  location: Exclude<LearningLocation, { kind: 'not-found' }>,
): void {
  history.push(buildLearningPath(location));
}

export function replaceWithResolvedLocation(
  history: Pick<NavigationHistory, 'replace'>,
  resolved: ResolvedLearningLocation,
): void {
  history.replace(buildLearningPath(resolved.location));
}

export function createWindowNavigationHistory(windowLike: Window, basePath = import.meta.env.BASE_URL): NavigationHistory {
  const toInternalPath = (pathname: string) => stripDeploymentBasePath(pathname, basePath) ?? pathname;
  const toPublicPath = (path: string) => applyDeploymentBasePath(path, basePath);

  return {
    get pathname() {
      return toInternalPath(windowLike.location.pathname);
    },
    push(path: string) {
      windowLike.history.pushState(null, '', toPublicPath(path));
    },
    replace(path: string) {
      windowLike.history.replaceState(null, '', toPublicPath(path));
    },
    subscribe(listener) {
      const handlePopState = () => listener(toInternalPath(windowLike.location.pathname));
      windowLike.addEventListener('popstate', handlePopState);
      return () => windowLike.removeEventListener('popstate', handlePopState);
    },
  };
}
