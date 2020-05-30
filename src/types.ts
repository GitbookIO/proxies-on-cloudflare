export type ServeFunction = (event: FetchEvent) => Promise<Response>;

export interface FetchEvent extends Event {
    request: Request;

    respondWith(r: Promise<Response> | Response): Promise<Response>;
    waitUntil(p: Promise<any>): void;
}

export interface FetchCFOptions {
    cacheEverything?: boolean;
}
