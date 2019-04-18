// express => koa => quoi ?
// DISCLAIMER: this isn't really optimized
// TODO:
// - [ ] Middleware
// - [ ] Nicer chaining / composition

/*
 * Usage
const app = quoi();

app.domain('*.gitbook.com').serve(<ServeFunction>);
app.get('/__mix/*', (request) => ...);
app.listen();
*/

import { matcher } from './globs'
import { FetchEvent } from "./types";
import { patchEvent, patchRequest } from './common/patch'
export type ServeFunction = (event: FetchEvent) => Promise<Response>;
export type FilterFunction = (request: Request) => boolean;
export type PatchFunction = (request: Request) => Request;

interface Route {
    ctx?: AppRouteContext;
    patch?: PatchFunction;
    should: FilterFunction;
    handler: ServeFunction;
}

export default function quoi(): App {
    return new App();
}

class App {
    routes: Array<Route> = [];
    root: AppRoute;

    constructor() {
        this.root = new AppRoute(this, {});
    }

    handler = async (event: any): Promise<Response> => {
        const e = event as FetchEvent;
        // Check routes one by one
        console.log('url:', e.request.url);
        for (const route of this.routes) {
            // Check routing
            if (route.should(e.request)) {
                // Patch event if necessary
                const ev = route.patch ? patchEvent(e, route.patch(e.request)) : e;
                return route.handler(ev);
            } else {
                console.log('skip', route.ctx);
            }
        }

        // Error no matching route
        return new Response('quoi: no matching route', {
            status: 500,
        });
    }

    // filter returns true if any route in the app can handle the request
    filter = (request: Request): boolean => {
        return this.routes.some(route => route.should(request));
    }

    /* Route methods */
    path(expr: string): AppRoute {
        return this.root.path(expr);
    }

    method(verb: string): AppRoute {
        return this.root.method(verb);
    }

    domain(expr: string): AppRoute {
        return this.root.domain(expr);
    }

    get(path: string, handler: ServeFunction): void {
        return this.root.get(path, handler);
    }

    put(path: string, handler: ServeFunction): void {
        return this.root.put(path, handler);
    }

    post(path: string, handler: ServeFunction): void {
        return this.root.post(path, handler)
    }

    serve(handler: ServeFunction): void {
        return this.root.serve(handler);
    }

    mount(app: App): void {
        return this.root.mount(app);
    }

    /* Listen methods */
    _onFetch = (event: any) => {
        const resp = this.handler(event);
        event.respondWith(resp);
    }

    listen = () => {
        addEventListener("fetch", this._onFetch);
    }

    unlisten = () => {
        removeEventListener("fetch", this._onFetch);
    }
}

interface AppRouteContext {
    root?: string;
    path?: string;
    method?: string;
    domain?: string;
}

class AppRoute {
    app: App;
    ctx: AppRouteContext;

    constructor(app: App, ctx: AppRouteContext) {
        this.app = app;
        this.ctx = ctx;
    }

    _sub(ctxChanges: AppRouteContext): AppRoute {
        return new AppRoute(this.app, {
            ...this.ctx,
            ...ctxChanges,
        });
    }

    path(expr: string): AppRoute {
        return this._sub({ path: expr });
    }

    method(expr: string): AppRoute {
        return this._sub({ method: expr });
    }

    domain(expr: string): AppRoute {
        return this._sub({ domain: expr });
    }

    get(path: string, handler: ServeFunction): void {
        return this._sub({ method: 'GET', path: path }).serve(handler)
    }

    put(path: string, handler: ServeFunction): void {
        return this._sub({ method: 'PUT', path: path }).serve(handler)
    }

    post(path: string, handler: ServeFunction): void {
        return this._sub({ method: 'POST', path: path }).serve(handler)
    }

    serve(handler: ServeFunction): void {
        this.app.routes.push({
            should: this.filter(),
            patch: this.patcher(),
            handler: handler,
            ctx: this.ctx,
        })
    }

    root(rootPath: string): AppRoute {
        return this._sub({ root: rootPath });
    }

    patcher(): (PatchFunction | undefined) {
        // Only patch request if we have a root set
        if (!this.ctx.root) {
            return undefined;
        }
        const prefix = this.ctx.root;
        return (req: Request) => {
            const url = new URL(req.url);
            url.pathname = trimRoot(url.pathname, prefix);
            return patchRequest(req, { url: url.toString() });
        }
    }

    mount(app: App): void {
        const routeFilter = this.filter();
        const combinedFilter = (req: Request) => (routeFilter(req) && app.filter(req));
        this.app.routes.push({
            should: combinedFilter,
            handler: app.handler,
            ctx: this.ctx,
        })
    }

    filter(): FilterFunction {
        return filterFromCtx(this.ctx)
    }
}

function filterFromCtx(ctx: AppRouteContext): FilterFunction {
    const { root, path, method, domain } = ctx;

    // Pattern matchers
    const pathMatcher = path ? matcher(path) : null;
    const domainMatcher = domain ? matcher(domain) : null;

    return (req: Request): boolean => {
        const url = new URL(req.url);

        // The url's pathname after truncating root
        const finalPath = trimRoot(url.pathname, root || '');

        // Match domain, path, method
        const r = root ? url.pathname.startsWith(root) : true;
        const d = domainMatcher ? domainMatcher(url.hostname) : true;
        const p = pathMatcher ? pathMatcher(finalPath) : true;
        const m = method ? method === req.method : true;

        // All must match for filter to be true
        return (r && d && p && m);
    }
}

// trimRoot removes the root part of a path but ensure it still starts with a /
function trimRoot(path: string, root: string): string {
    const trimmed = trimPrefix(path, root);
    return ensurePrefix(trimmed, '/');
}

function trimPrefix(str: string, prefix: string): string {
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}

function ensurePrefix(str: string, prefix: string): string {
    return str.startsWith(prefix) ? str : (prefix + str);
}
