// !!! Please use !!!
// import firecloud from 'firecloud';
import firecloud from '../../src/worker';

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

// Init once (globally) for better perfs
const fetcher = firecloud('gitbook-staging', HOSTING_CONFIG);
addEventListener("fetch", (event) => {
    let prom = fetcher(event)
        .then(
            resp => resp,
            err => new Response(err.stack || err, { status: 500 })
        )
    return event.respondWith(prom);
});
