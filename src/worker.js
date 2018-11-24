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
        console.log('regex:', globs[i].regex.toString());
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
    console.time('firecloud');
    const request = event.request;

    // Check cache
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) {
      console.log('served from cache:', request.url)
      console.timeEnd('firecloud');
      return response;
    }

    const pathname = (new URL(request.url)).pathname;
    const funcname = matcher(pathname);
    const endpoint = funcname ? cloudfuncEndpoint(projectID, funcname) : hosting;
    console.log('url:', pathname)
    console.log('funcname:', funcname);
    console.log('endpoint:', endpoint.toString());

    // Modify request
    const upstreamRequest = requestToUpstream(request, endpoint);

    // Make request
    response = await fetch(upstreamRequest)
    //event.waitUntil(cache.put(request, response.clone()))

    console.timeEnd('firecloud');
    return response;
  }
}

// Init once (globally) for better perfs
const fetcher = firebaseFetcher('gitbook-staging', HOSTING_CONFIG);
addEventListener("fetch", event => {
  event.respondWith(fetcher(event));
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
