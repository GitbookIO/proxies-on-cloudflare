import { requestCacheKey, varyHash } from './cache';
import { FetchEvent, CloudflareCacheStorage } from './types';

export interface HeaderOptions {
    [key: string]: string | null
}
export type ServeFunction = (event: FetchEvent) => Promise<Response>;
export type GetHeaders = (req: Request) => HeaderOptions;
export type GetEndpoint = (req: Request) => URL;

export function StaticEndpoint(endpointURL: string): GetEndpoint {
    const url = new URL(endpointURL);
    return (req: Request) => url;
}

export function StaticHeaders(values: HeaderOptions): GetHeaders {
    return (req: Request) => values;
}

export interface ReverseProxyOptions {
    headers?: GetHeaders;
    endpoint: GetEndpoint;
}

export interface CachedProxyOptions {
    seed: string;
    headers?: GetHeaders;
    endpoint: GetEndpoint;
}

export function CachedProxy(opts: CachedProxyOptions): ServeFunction {
    // Get our regular reverse proxy
    const proxy = ReverseProxy({
        headers: opts.headers,
        endpoint: opts.endpoint,
    })

    return async function serve(event: FetchEvent): Promise<Response> {
        const request = event.request;
        const hash = await varyHash(request, opts.seed);
        // Headers
        const globalHeaders = opts.headers ? opts.headers(request) : {};

        // Compute cache key to simulate 'Vary' caching support
        const cacheKey = await requestCacheKey(request, opts.seed);

        // Check cache
        const cfCaches = (caches as unknown) as CloudflareCacheStorage;
        const cache = cfCaches.default;
        const cachedResp = await cache.match(cacheKey);
        if (cachedResp) {
            // Change headers for cache hit
            const headers = headerChanges(cachedResp.headers, {
                ...globalHeaders,
                'via': 'magic cache',
                'x-magic-hash': hash,
                'x-cache': 'HIT',
                'link': null,
            });
            return customHeaders(cachedResp, headers);
        }

        // Send to upstream
        const response = await proxy(event);
        event.waitUntil(cache.put(cacheKey, response.clone()))

        // Change headers for cache miss
        const headers = headerChanges(response.headers, {
            ...globalHeaders,
            'via': 'no cache',
            'x-magic-hash': hash,
            'x-cache': 'MISS',
            'link': null,
        });
        return customHeaders(response, headers);
    }
}

export function ReverseProxy(opts: ReverseProxyOptions): ServeFunction {
    return async function serve(event: FetchEvent): Promise<Response> {
        const request = event.request;

        // Find which endpoint to use
        const endpoint = opts.endpoint(request);

        // Modify request
        const upstreamRequest = requestToUpstream(request, endpoint);
        console.log('upstreamRequest:', upstreamRequest);

        // Make request
        const response = await fetch(upstreamRequest, {
            redirect: 'manual',
        });

        // Return response \o/
        return response;
    }
}

// requestToUpstream rewrites a Request to route it to the upstream
export function requestToUpstream(request: Request, upstream: URL): Request {
    // Parse Request's URL
    const url = new URL(request.url);
    // Preserve original hostname (to pass as header)
    const hostname = url.hostname;

    // Modify request (to route to upstream)
    url.pathname = `${upstream.pathname}/${url.pathname}`;
    url.hostname = upstream.hostname;

    // Copy old headers
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', hostname);
    headers.set('X-Forwarded-Proto', url.protocol);

    return new Request(url.toString(), {
        body: request.body,
        method: request.method,
        headers: headers
    });
}

function headerChanges(headers: Headers, changes: HeaderOptions): Headers {
    const copy = new Headers(headers);
    const keys = Object.keys(changes).sort();
    keys.forEach(key => {
        const value = changes[key];
        if (value) {
            copy.set(key, value);
        } else {
            copy.delete(key);
        }
    });
    return copy;
}

// Returns a new response with customized headers (provided)
function customHeaders(response: Response, headers: Headers): Response {
    return new Response(response.body, {
        headers: headers,
        status: response.status,
        statusText: response.statusText,
    })
}
