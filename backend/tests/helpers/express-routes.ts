import type { Express } from 'express';

/**
 * List every route registered on an Express 4 app as { method, path } with
 * OpenAPI-style path parameters ({id}) and without the /api prefix.
 */
export function listApiRoutes(app: Express): { method: string; path: string }[] {
  const routes: { method: string; path: string }[] = [];
  const stack: any[] = (app as any)._router.stack;

  const mountPrefix = (layer: any): string => {
    // e.g. /^\/api\/auth\/?(?=\/|$)/i  ->  /api/auth
    const src: string = layer.regexp?.source ?? '';
    if (layer.regexp?.fast_slash) return '';
    return src
      .replace('^', '')
      .replace('\\/?(?=\\/|$)', '')
      .replace(/\\\//g, '/');
  };

  const addRoute = (prefix: string, route: any) => {
    const paths: string[] = Array.isArray(route.path) ? route.path : [route.path];
    for (const p of paths) {
      const full = `${prefix}${p === '/' ? '' : p}` || '/';
      if (!full.startsWith('/api/')) continue;
      for (const method of Object.keys(route.methods)) {
        routes.push({
          method: method.toUpperCase(),
          path: full.replace(/^\/api/, '').replace(/:(\w+)/g, '{$1}'),
        });
      }
    }
  };

  for (const layer of stack) {
    if (layer.route) addRoute('', layer.route);
    else if (layer.name === 'router' && layer.handle?.stack) {
      const prefix = mountPrefix(layer);
      for (const inner of layer.handle.stack) if (inner.route) addRoute(prefix, inner.route);
    }
  }
  return routes;
}
