import { patchHeaders, patchResponse } from '../common/patch';
import { FetchEvent, ServeFunction } from '../types';

import { cacheKey, varyHash } from './key';
import { CloudflareCacheStorage } from './types';

export function cache(handler: ServeFunction, seed: string): ServeFunction {
  return async function serve(event: FetchEvent): Promise<Response> {
    const request = event.request;
    const hash = await varyHash(request, seed);

    // Compute cache key to simulate 'Vary' caching support
    const key = await cacheKey(request, seed);

    // Check cache
    const cfCaches = (caches as unknown) as CloudflareCacheStorage;
    const cfCache = cfCaches.default;
    const cachedResp = await cfCache.match(key);
    if (cachedResp) {
      return patchResponse(cachedResp, {
        headers: patchHeaders(cachedResp.headers, {
          via: 'magic cache',
          'x-magic-hash': hash,
          'x-cache': 'HIT',
          link: null
        })
      });
    }

    // Send to upstream
    const response = await handler(event);
    event.waitUntil(cfCache.put(key, response.clone()));

    // Change headers for cache miss
    return patchResponse(response, {
      headers: patchHeaders(response.headers, {
        via: 'no cache',
        'x-magic-hash': hash,
        'x-cache': 'MISS',
        link: null
      })
    });
  };
}
