/* @flow */
// const CLOUD_FUNCTION_URL = 'https://request-dump.herokuapp.com'

import { requestCacheKey, varyHash } from './cache';
import { rewritesMatcher } from './rewrites';
import { cloudfuncHost, cloudfuncEndpoint, fbhostingEndpoint } from './urls';

// firebaseProxy
export default function firebaseFetcher(projectID, config) {
  // Cloud Function host to route requests to
  const upstream = cloudfuncHost(projectID);
  // Matcher to map URL paths to cloud funcs
  const matcher = rewritesMatcher(config.rewrites);
  // Static Hosting endpoint
  const hosting = fbhostingEndpoint(projectID)

  return async function proxy(event) {
    const request = event.request;
    const hash = await varyHash(request);
    // Compute cache key to simulate 'Vary' caching support
    const cacheKey = await requestCacheKey(request);

    // Check cache
    const cache = caches.default;
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
    const url = new URL(request.url);
    const pathname = url.pathname;
    const funcname = matcher(pathname);
    // Is this URL part of Firebase's reserved /__/* namespace
    const isReserved = pathname.startsWith('/__/');

    // Pick endpoint to route to
    let endpoint;
    if (isReserved || !funcname) {
      endpoint = hosting;
    } else {
      endpoint = cloudfuncEndpoint(projectID, funcname);
    }

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
}

function requestToUpstream(request, upstream) {
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

  return new Request(url, {
    body: request.body,
    method: request.method,
    headers: headers
  });
}

// Returns a new response with customized headers (provided)
function customHeaders(response, headers) {
  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText,
  })
}
