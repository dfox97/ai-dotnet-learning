export type LearningLocation =
  | { kind: 'dashboard' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'diagnostic'; diagnosticId: string }
  | { kind: 'practice'; activityId: string }
  | { kind: 'report' }
  | { kind: 'capstone' }
  | { kind: 'not-found'; path: string };

function decodeSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.trim().length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function parseLearningLocation(pathname: string): LearningLocation {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { kind: 'dashboard' };
  if (path === '/report') return { kind: 'report' };
  if (path === '/capstone') return { kind: 'capstone' };

  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2) return { kind: 'not-found', path: pathname };

  const [area, rawId] = segments;
  const id = decodeSegment(rawId);
  if (!id) return { kind: 'not-found', path: pathname };

  if (area === 'lessons') return { kind: 'lesson', lessonId: id };
  if (area === 'diagnostics') return { kind: 'diagnostic', diagnosticId: id };
  if (area === 'practice') return { kind: 'practice', activityId: id };

  return { kind: 'not-found', path: pathname };
}

export function buildLearningPath(location: Exclude<LearningLocation, { kind: 'not-found' }>): string {
  switch (location.kind) {
    case 'dashboard': return '/';
    case 'lesson': return `/lessons/${encodeURIComponent(location.lessonId)}`;
    case 'diagnostic': return `/diagnostics/${encodeURIComponent(location.diagnosticId)}`;
    case 'practice': return `/practice/${encodeURIComponent(location.activityId)}`;
    case 'report': return '/report';
    case 'capstone': return '/capstone';
  }
}

export function isKnownLearningLocation(
  location: LearningLocation,
  known: {
    lessonIds: ReadonlySet<string>;
    diagnosticIds: ReadonlySet<string>;
    practiceIds: ReadonlySet<string>;
  },
): boolean {
  if (location.kind === 'not-found') return false;
  if (location.kind === 'lesson') return known.lessonIds.has(location.lessonId);
  if (location.kind === 'diagnostic') return known.diagnosticIds.has(location.diagnosticId);
  if (location.kind === 'practice') return known.practiceIds.has(location.activityId);
  return true;
}
