/* @flow */
//const CLOUD_FUNCTION_URL = 'https://us-central1-gitbook-staging.cloudfunctions.net/ssrWebsite';
const CLOUD_FUNCTION_URL = 'https://request-dump.herokuapp.com'

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
      if (path.match(globs[i].regex)) {
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
  return str.match(/\!\(\S+?\)|\*\*|\*|(?:\/$)/) !== null;
}

// pathGlobToRegex converts a glob (firebase hosting "source") to a regex
function pathGlobToRegex(str) {
  return str
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
}

function cloudfuncHost(projectID: String) {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/`);
}

function cloudfuncEndpoint(projectID: String, name: String): URL {
  return new URL(`https://us-central1-${projectID}.cloudfunctions.net/${name}`);
}

// firebaseProxy
function firebaseFetcher(projectID: String, config: Object) {
  // Cloud Function host to route requests to
  const upstream = cloudfuncHost(projectID);
  // Matcher to map URL paths to cloud funcs
  const matcher = rewritesMatcher(config.rewrites);

  return async function proxy(request: Request) {
    const funcname = matcher(request.pathname || '/');
    const endpoint = cloudfuncEndpoint(projectID, funcname);

    // Modify request
    const upstreamRequest = requestToUpstream(request, endpoint);

    // Make request
    const response = await fetch(upstreamRequest)
    const { readable, writable } = new TransformStream()

    streamBody(response.body, writable);

    return new Response(readable, response)
  }
}

addEventListener("fetch", event => {
  event.respondWith(firebaseFetcher('gitbook-staging', HOSTING_CONFIG)(event.request))
  // event.respondWith(fetchAndStream(event.request))
});

function requestToUpstream(request: Request, upstream: URL): URL {
  // Parse Request's URL
  const url = new URL(request.url);
  // Preserve original hostname (to pass as header)
  const hostname = url.hostname;

  // Modify request (to route to upstream)
  url.pathname = `${upstream.pathname}/${url.pathname}`;
  url.hostname = upstream.hostname;

  // Assemble request
  return new Request(url, {
    method: request.method,
    headers: {
      'X-Forwarded-Host': hostname,
      'X-Forwarded-Proto': url.protocol,
    }
  });
}

const UPSTREAM_URL = new URL(CLOUD_FUNCTION_URL);
async function fetchAndStream(request: Request): Promise<Response> {
  // Modify request
  const upstreamRequest = requestToUpstream(request, UPSTREAM_URL);

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
