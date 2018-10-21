/* @flow */
const CLOUD_FUNCTION_URL = 'https://us-central1-gitbook-staging.cloudfunctions.net/ssrWebsite';

addEventListener("fetch", event => {
  event.respondWith(fetchAndStream(event.request))
});

function createUpstreamURL(requestUrl: URL): URL {
    const url = new URL(CLOUD_FUNCTION_URL);
    url.pathname = `${url.pathname}/${requestUrl.pathname}`;

    return url
}

async function fetchAndStream(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstreamUrl = createUpstreamURL(requestUrl);
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers
  });
  const response = await fetch(upstreamRequest)
  const { readable, writable } = new TransformStream()

  streamBody(response.body, writable)

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
