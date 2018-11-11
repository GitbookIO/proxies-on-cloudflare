/* @flow */
//const CLOUD_FUNCTION_URL = 'https://us-central1-gitbook-staging.cloudfunctions.net/ssrWebsite';
const CLOUD_FUNCTION_URL = 'https://request-dump.herokuapp.com'

addEventListener("fetch", event => {
  event.respondWith(fetchAndStream(event.request))
});

const UPSTREAM_URL = new URL(CLOUD_FUNCTION_URL);
function requestToUpstream(request: Request): URL {
  // Parse Request's URL
  const url = new URL(request.url);
  // Preserve original hostname (to pass as header)
  const hostname = url.hostname;

  // Modify request (to route to upstream)
  url.pathname = `${UPSTREAM_URL.pathname}/${url.pathname}`;
  url.hostname = UPSTREAM_URL.hostname;

  // Assemble request
  return new Request(url, {
    method: request.method,
    headers: {
      'X-Forwarded-Host': hostname,
      'X-Forwarded-Proto': url.protocol,
    }
  });
}

async function fetchAndStream(request: Request): Promise<Response> {
  // Modify request
  const upstreamRequest = requestToUpstream(request);

  // Make request
  const response = await fetch(upstreamRequest)
  const { readable, writable } = new TransformStream()

  streamBody(response.body, writable);

  return new Response(readable, response)
}

async function streamBody(readable, writable) {
  const reader = readable.getReader()
  const writer = writable.getWriter()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    await writer.write(value)
  }

  await writer.close()
}
