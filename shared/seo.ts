export const SITE_ORIGIN = 'https://meatmall.kr';

export const PUBLIC_PAGE_PATHS = ['/', '/contact', '/privacy', '/terms'] as const;

export function isPublicPage(pathname: string): boolean {
  return (PUBLIC_PAGE_PATHS as readonly string[]).includes(pathname)
    || /^\/products\/[1-9]\d*$/.test(pathname)
    || /^\/service-category\/[^/]+$/.test(pathname);
}

export function canonicalUrl(pathname: string): string {
  return SITE_ORIGIN + (pathname === '/' ? '/' : pathname.replace(/\/+$/, ''));
}
