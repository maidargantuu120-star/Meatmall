import { canonicalUrl, isPublicPage, PUBLIC_PAGE_PATHS } from '../shared/seo';
import type { IStorage } from './storage';

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[char]!));
}

// Read the catalog on request so new/deleted products require no redeployment.
export async function createSitemap(storage: IStorage): Promise<string> {
  const [products, categories] = await Promise.all([
    storage.getProducts(), storage.getServiceCategories(),
  ]);
  const paths = new Set<string>(PUBLIC_PAGE_PATHS);
  for (const product of products) paths.add(`/products/${product.id}`);
  for (const category of categories) {
    if (category.isActive) paths.add(`/service-category/${encodeURIComponent(category.slug)}`);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + Array.from(paths).map(path => `  <url><loc>${escapeXml(canonicalUrl(path))}</loc></url>`).join('\n')
    + '\n</urlset>\n';
}

export function rewritePageSeo(response: Response, pathname: string): Response {
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const canonical = canonicalUrl(pathname);
  const robots = isPublicPage(pathname) && response.status === 200
    ? 'index, follow' : 'noindex, follow';
  const rewritten = new HTMLRewriter()
    .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', canonical); } })
    .on('meta[property="og:url"]', { element(element) { element.setAttribute('content', canonical); } })
    .on('meta[name="robots"]', { element(element) { element.setAttribute('content', robots); } })
    .transform(response);
  rewritten.headers.delete('etag');
  if (robots.startsWith('noindex')) rewritten.headers.set('X-Robots-Tag', robots);
  return rewritten;
}
