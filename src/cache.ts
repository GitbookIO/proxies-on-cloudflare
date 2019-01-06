import { sha256 } from './crypto';

// requestCacheKey builds a Request object that can be used as a cloudflare cache key
export async function requestCacheKey(request: Request): Promise<Request> {
    // Ignore non GETs
    if (request.method != 'GET') {
        return request;
    }

    // Hash request
    const hash = await varyHash(request);

    // Get original path
    const url = new URL(request.url);

    url.pathname = `/__magic_cache/${hash}` + url.pathname;
    return new Request(url.toString(), {
        headers: request.headers,
        method: 'GET'
    });
}

// varyHash hashes a request's headers so we can use them in the cache key
export async function varyHash(request: Request): Promise<string> {
    const seed = '44'
    const varyKeys = ['Accept-Encoding', 'Authorization', 'Cookie', 'X-CDN-Host'];
    const values = varyKeys.map(k => request.headers.get(k) || '');
    const hash = await sha256([seed].concat(values).join(','));
    return hash;
}
