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

export function createWindowNavigationHistory(windowLike: Window): NavigationHistory {
  return {
    get pathname() {
      return windowLike.location.pathname;
    },
    push(path: string) {
      windowLike.history.pushState(null, '', path);
    },
    replace(path: string) {
      windowLike.history.replaceState(null, '', path);
    },
    subscribe(listener) {
      const handlePopState = () => listener(windowLike.location.pathname);
      windowLike.addEventListener('popstate', handlePopState);
      return () => windowLike.removeEventListener('popstate', handlePopState);
    },
  };
}
