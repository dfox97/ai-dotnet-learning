function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

export function stripDeploymentBasePath(pathname: string, basePath: string): string | null {
  const base = normalizeBasePath(basePath);
  if (base === '/') return pathname.startsWith('/') ? pathname : `/${pathname}`;

  const withoutTrailingSlash = base.slice(0, -1);
  if (pathname === withoutTrailingSlash || pathname === base) return '/';
  if (!pathname.startsWith(base)) return null;

  const remainder = pathname.slice(base.length - 1);
  return remainder || '/';
}

export function applyDeploymentBasePath(path: string, basePath: string): string {
  const base = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base === '/') return normalizedPath;
  if (normalizedPath === '/') return base;
  return `${base.slice(0, -1)}${normalizedPath}`;
}
