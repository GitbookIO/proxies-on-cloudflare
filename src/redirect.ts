import { ServeFunction } from './quoi';

// to returns a ServeFunction that redirects to that specific URL
// discarding the current path & query string (e.g: hard redirect)
export function to(targetURL: string): ServeFunction {
    return async function serve(): Promise<Response> {
        return Response.redirect(targetURL);
    };
}

// TODO: implement a HTTPS redirect
// forceHTTPS() ?

// TODO: implement a "soft redirect" that preserves path and querystring
// towards() ?
