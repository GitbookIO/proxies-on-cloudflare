import { patchRequest, patchHeaders } from '../common/patch'
import { FetchEvent, ServeFunction } from '../types';

export type GetEndpoint = (req?: Request) => URL;

export function proxy(picker: GetEndpoint): ServeFunction {
    return async function serve(event: FetchEvent): Promise<Response> {
        const request = event.request;

        // Find which endpoint to use
        const endpoint = picker(request);

        // Modify request
        const upstreamRequest = requestToUpstream(request, endpoint);

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
    const headers = patchHeaders(request.headers, {
        'X-Forwarded-Host': hostname,
        'X-Forwarded-Proto': url.protocol,
    });

    return patchRequest(request, {
        url: url.toString(),
        headers: headers,
    });
}
