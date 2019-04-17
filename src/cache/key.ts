import { sha256 } from './crypto';
import { patchRequest } from '../common/patch';

// cacheKey builds a Request object that can be used as a cloudflare cache key
export async function cacheKey(request: Request, seed: string): Promise<Request> {
    // Ignore non GETs
    if (request.method != 'GET') {
        return request;
    }

    // Hash request
    const hash = await varyHash(request, seed);

    // Get original path
    const url = new URL(request.url);
    url.pathname = `/__magic_cache/${hash}` + url.pathname;

    return patchRequest(request, { url: url.toString() });
}

// varyHash hashes a request's headers so we can use them in the cache key
export async function varyHash(request: Request, seed: string): Promise<string> {
    const varyKeys = ['Accept-Encoding', 'Authorization', 'Cookie', 'X-CDN-Host'];
    const values = varyKeys.map(k => request.headers.get(k) || '');
    const hash = await sha256([seed].concat(values).join(','));
    return hash;
}
