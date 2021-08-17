import { cache } from '../cache';
import { patchHeaders, patchResponse } from '../common/patch';
import { custom as customProxy } from '../proxy/';
import { FetchEvent, ServeFunction } from '../types';
import { Matcher } from './rewrites';
import { FirebaseConfig } from './types';
import { cloudfuncEndpoint, fbhostingEndpoint } from './urls';

interface ExtraOptions {
  // Extra headers to add to each response
  headers?: HeaderOptions;
  // Seed (string) of our cache hash
  // changing the seed will invalidate all previous entries
  seed?: string;
  // Custom endpoint to fetch public files from instead of Firebase hosting
  publicEndpoint?: URL;
}
interface HeaderOptions {
  [key: string]: string | null;
}

// firebase returns a proxy (ServeFunction) that can route traffic
// to individual cloud functions described in a firebase.json
// and fallback traffic goes to firebase-hosting (e.g: static files)
export default function firebase(
  projectID: string,
  config: FirebaseConfig,
  extra?: ExtraOptions
): ServeFunction {
  const fbase = new Firebase(projectID, config, extra);
  return fbase.serve.bind(fbase);
}

class Firebase {
  public matcher: Matcher;
  public projectID: string;
  public publicEndpoint: URL;
  public hostingEndpoint: URL;
  public globalHeaders: HeaderOptions;
  public proxy: ServeFunction;
  public seed: string;

  constructor(projectID: string, config: FirebaseConfig, extra?: ExtraOptions) {
    // Keep project ID
    this.projectID = projectID;
    // Matcher to map URL paths to cloud funcs
    this.matcher = new Matcher(config.rewrites);
    // Static Hosting endpoint
    this.hostingEndpoint = fbhostingEndpoint(projectID);
    // Endpoint for public files in hosting, can be overriden in extra options
    this.publicEndpoint =
      extra && extra.publicEndpoint
        ? extra.publicEndpoint
        : this.hostingEndpoint;
    // Custom headers
    this.globalHeaders = extra && extra.headers ? extra.headers : {};
    // Cache seed
    this.seed = extra && extra.seed ? extra.seed : '42';
    // Proxy
    this.proxy = cache(customProxy(req => this.getEndpoint(req!)), this.seed);
  }

  public async serve(event: FetchEvent): Promise<Response> {
    return this._serve(event).then(
      resp => resp,
      err => new Response(err.stack || err, { status: 500 })
    );
  }

  public async _serve(event: FetchEvent): Promise<Response> {
    const resp = await this.proxy(event);
    return patchResponse(resp, {
      headers: patchHeaders(resp.headers, this.globalHeaders)
    });
  }

  public getEndpoint(request: Request): URL {
    // Get pathname
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Is this URL part of Firebase's reserved /__/* namespace
    const isReserved = pathname.startsWith('/__/');
    // If reserved, pass through to the original FirebaseHosting application endpoint
    if (isReserved) {
      return this.hostingEndpoint;
    }

    // Get cloud func for path
    const match = this.matcher.match(pathname);
    // If no func matched, we're looking for a public file in Firebase hosting, pass through
    if (!match || !('function' in match)) {
      return this.publicEndpoint;
    }

    // Route to specific cloud function
    return cloudfuncEndpoint(this.projectID, match.function);
  }
}
