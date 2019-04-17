import { FetchEvent } from '../types';

// patchEvent replaces the event's request (which is read-only) with a new request
export function patchEvent(event: FetchEvent, req: Request): FetchEvent {
    return new Proxy(event, {
        get: (obj, key) => (key === 'request' ? req : Reflect.get(obj, key)),
    });
}

interface RequestChanges {
    url?: string,
    method?: string,
    body?: ReadableStream<Uint8Array> | null,
    headers?: Headers,
}
// patchRequest modifies a request with the provided changes
export function patchRequest(req: Request, changes: RequestChanges): Request {
    return new Request(changes.url || req.url, {
        method: (changes.method || req.method),
        body: (changes.body || req.body),
        headers: (changes.headers || req.headers),
    });
}

// patchResponse returns a new response with customized headers (or body, status, etc ...)
export function patchResponse(resp: Response, changes: ResponseInit): Response {
    const defaults = {
        headers: resp.headers,
        status: resp.status,
        statusText: resp.statusText,
    }
    return new Response(resp.body, {
        ...defaults,
        ...changes,
    });
}

interface HeaderChanges {
    [key: string]: string | null
}
// patchHeaders returns a copy of the headers with the applied changes
export function patchHeaders(headers: Headers, changes: HeaderChanges): Headers {
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
