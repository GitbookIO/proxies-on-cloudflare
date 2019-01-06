export interface FirebaseConfig {
    rewrites: FirebaseRewrites
}

export interface FirebaseRewrites extends Array<FirebaseRewrite> { }

export interface FirebaseRewrite {
    source: string,
    function: string,
}

export interface FetchEvent extends Event {
    request: Request;

    respondWith(r: Promise<Response> | Response): Promise<Response>;
    waitUntil(p: Promise<any>): void;
}

export interface CloudflareCache {
    put(request: Request, response: Response): Promise<any>;
    match(request: Request): Promise<Response | undefined>;
}

export interface CloudflareCacheStorage {
    default: CloudflareCache
}
