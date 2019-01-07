import { requestCacheKey, varyHash } from './cache';
import { Matcher } from './rewrites';
import { cloudfuncHost, cloudfuncEndpoint, fbhostingEndpoint } from './urls';
import { FirebaseConfig, FetchEvent, CloudflareCacheStorage } from './types';

export default class FirebaseOnCloudflare {
    matcher: Matcher;
    projectID: string;
    functionEndpoint: URL;
    hostingEndpoint: URL;

    constructor(projectID: string, config: FirebaseConfig) {
        // Keep project ID
        this.projectID = projectID;
        // Matcher to map URL paths to cloud funcs
        this.matcher = new Matcher(config.rewrites);
        // Cloud Function host to route requests to
        this.functionEndpoint = cloudfuncHost(projectID);
        // Static Hosting endpoint
        this.hostingEndpoint = fbhostingEndpoint(projectID)
    }

    async serve(event: FetchEvent): Promise<Response> {
        const prom = this._serve(event)
            .then(
                resp => resp,
                err => new Response(err.stack || err, { status: 500 })
            );

        return event.respondWith(prom);
    }

    async _serve(event: FetchEvent): Promise<Response> {
        const request = event.request;
        const hash = await varyHash(request);

        // Compute cache key to simulate 'Vary' caching support
        const cacheKey = await requestCacheKey(request);

        // Check cache
        const cfCaches = (caches as unknown) as CloudflareCacheStorage;
        const cache = cfCaches.default;
        let response = await cache.match(cacheKey);
        if (response) {
            // Change headers for cache hit
            const headers = new Headers(response.headers);
            headers.set('via', 'magic cache');
            headers.set('x-magic-hash', hash);
            headers.delete('link');
            return customHeaders(response, headers);
        }

        // Find which endpoint to use
        const endpoint = this.getEndpoint(request);

        // Modify request
        const upstreamRequest = requestToUpstream(request, endpoint);

        // Make request
        response = await fetch(upstreamRequest, {
            redirect: 'manual',
        });
        event.waitUntil(cache.put(cacheKey, response.clone()))

        // Change headers for cache miss
        const headers = new Headers(response.headers);
        headers.set('via', 'no cache')
        headers.set('x-magic-hash', hash);
        headers.delete('link');

        return customHeaders(response, headers);
    }

    getEndpoint(request: Request): URL {
        // Get pathname
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Get cloud func for path
        const funcname = this.matcher.match(pathname);

        // Is this URL part of Firebase's reserved /__/* namespace
        const isReserved = pathname.startsWith('/__/');

        // If no func matched or reserved, pass through to FirebaseHosting
        if (isReserved || !funcname) {
            return this.hostingEndpoint;
        }

        // Route to specific cloud function
        return cloudfuncEndpoint(this.projectID, funcname);
    }
}

// requestToUpstream rewrites a Request to route it to the upstream
function requestToUpstream(request: Request, upstream: URL): Request {
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

// Returns a new response with customized headers (provided)
function customHeaders(response: Response, headers: Headers): Response {
    return new Response(response.body, {
        headers: headers,
        status: response.status,
        statusText: response.statusText,
    })
}
