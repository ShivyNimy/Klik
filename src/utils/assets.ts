/** Resolve a file in /public against Vite's configured deployment base path. */
export function assetUrl(path: string): string {
  const relativePath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
