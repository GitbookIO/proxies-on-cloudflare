/* @flow */
// const CLOUD_FUNCTION_URL = 'https://request-dump.herokuapp.com'

// Firebase Hosting Config
const HOSTING_CONFIG = {
  "public": "assets",
  "rewrites": [{
    "source": "/api",
    "function": "api"
  },
  {
    "source": "/api/**",
    "function": "api"
  },
  {
    "source": "/saml/**",
    "function": "saml"
  },
  {
    "source": "/export/**",
    "function": "exportContent-onArchive"
  },
  {
    "source": "/hooks/github",
    "function": "github-onWebhook"
  },
  {
    "source": "/hooks/stripe",
    "function": "billing-onWebhook"
  },
  {
    "source": "/hooks/slack/oauth",
    "function": "slack-onOAuth"
  },
  {
    "source": "/hooks/slack/command",
    "function": "slack-onCommand"
  },
  {
    "source": "/hooks/helpscout/app",
    "function": "backoffice-onHelpScoutCallback"
  },
  {
    "source": "/spaces/**",
    "function": "ssrSpaces"
  },
  {
    "source": "/share/space/thumbnail/**",
    "function": "spaces-onThumbnail"
  },
  {
    "source": "/!(public)/**",
    "function": "ssrWebsite"
  },
  {
    "source": "/!(public)",
    "function": "ssrWebsite"
  },
  {
    "source": "/",
    "function": "ssrWebsite"
  }
  ],
  "headers": [{
    "source": "public/**/*",
    "headers": [
      {
        "key": "Access-Control-Allow-Origin",
        "value": "*"
      },
      {
        "key": "Cache-Control",
        "value": "public, max-age=604800, s-maxage=1209600"
      }
    ]
  },
  {
    "source": "public/manifest.json",
    "headers": [
      {
        "key": "Access-Control-Allow-Origin",
        "value": "*"
      },
      {
        "key": "Cache-Control",
        "value": "private, no-cache, no-store"
      }
    ]
  }]
}

// rewritesMatcher builds a matching func that converts URL paths to cloud func names
function rewritesMatcher(rewrites) {
  // Dict of exact matches (map[path]function_name)
  const exact = rewrites.filter(r => !isGlob(r.source)).reduce((accu, r) => {
    accu[r.source] = r.function;
    return accu;
  }, {});
  // List of glob patterns (tansformed to regexes)
  const globs = rewrites.filter(r => isGlob(r.source)).map(r => ({
    regex: pathGlobToRegex(r.source),
    function: r.function,
  }));

  // Matching function, converting path to func name
  return function matcher(path) {
    // Try exact match
    if (path in exact) {
      return exact[path];
    }

    // Globs
    for (var i = 0; i < globs.length; i++) {
      if (globs[i].regex.test(path)) {
        return globs[i].function;
      }
    }

    // No function found
    return null;
  }
}

// isGlob returns true if a string looks like a glob pattern
function isGlob(str) {
  // Contains either
  // 1. "!(negation)""
  // 2. "*" glob stars
  // 3. Ends with /
  return /\!\(\S+?\)|\*\*|\*|(?:\/$)/.test(str);
}

// pathGlobToRegex converts a glob (firebase hosting "source") to a regex
function pathGlobToRegex(str) {
  const expr = str
    // Ensure path starts with '/'
    .replace(/^\/?/, '/')
    // Escape slashes and dots
    .replace(/\//g, '\\/')
    .replace(/\./, '\\.')
    // Transform negative expressions
    .replace(/\!\((\S+?)\)/, "(?!$1).*?")
    // Transform glob at end
    .replace(/\*\*$/, '.*')
    .replace(/\*\*\/\*/, '.*')

  // Add delimiters and
  return new RegExp(`^${expr}\$`);
}

function cloudfuncHost(projectID: String) {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/`);
}

function cloudfuncEndpoint(projectID: String, name: String): URL {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/${name}`);
}

function fbhostingEndpoint(projectID: String) {
  return new URL(`https://${projectID}.firebaseapp.com`);
}

// firebaseProxy
function firebaseFetcher(projectID: String, config: Object) {
  // Cloud Function host to route requests to
  const upstream = cloudfuncHost(projectID);
  // Matcher to map URL paths to cloud funcs
  const matcher = rewritesMatcher(config.rewrites);
  // Static Hosting endpoint
  const hosting = fbhostingEndpoint(projectID)

  return async function proxy(event: FetchEvent) {
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

// Init once (globally) for better perfs
const fetcher = firebaseFetcher('gitbook-staging', HOSTING_CONFIG);
addEventListener("fetch", (event) => {
  let prom = fetcher(event)
    .then(
      resp => resp,
      err => new Response(err.stack || err, { status: 500 })
    )
  return event.respondWith(prom);
});

function requestToUpstream(request: Request, upstream: URL): URL {
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

async function requestCacheKey(request) {
  // Ignore non GETs
  if (request.method != 'GET') {
    return request;
  }

  // Hash request
  const hash = await varyHash(request);

  // Get original path
  const url = new URL(request.url);

  url.pathname = `/__magic_cache/${hash}` + url.pathname;
  return new Request(url, {
    headers: request.headers,
    method: 'GET'
  });
}

async function varyHash(request) {
  const seed = '44'
  const varyKeys = ['Accept-Encoding', 'Authorization', 'Cookie', 'X-CDN-Host'];
  const values = varyKeys.map(k => request.headers.get(k));
  const hash = await sha256([seed].concat(values).join(','));
  return hash;
}

// Returns a new response with customized headers (provided)
function customHeaders(response, headers) {
  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText,
  })
}

function headerDict(headers) {
  let dict = {};
  for (var entry of headers.entries()) {
    dict[entry[0]] = entry[1];
  }
  return dict;
}

async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message)

  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // convert bytes to hex string
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  return hashHex
}
